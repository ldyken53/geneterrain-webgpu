(async () => {
  if (!navigator.gpu) {
    alert("WebGPU is not supported/enabled in your browser");
    return;
  }

  this.nodeIDToValue = {};
  this.nodeData = [];
  this.layoutData = null;

  function onSubmit() {
    const layoutReader = new FileReader();
    layoutReader.onload = function (event) {
      layoutData = layoutReader.result.split("\r\n");
      console.log(nodeIDToValue);
      for (element of layoutData) {
        parts = element.split("\t");
        if (nodeIDToValue[parts[0]]) {
          // Pushes values to node data in order of struct:
          // nodeValue, nodeX, nodeY, nodeSize
          nodeData.push(parseFloat(nodeIDToValue[parts[0]]), parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
        } else {
          console.log(parts[0]);
        }
      }
      render();
    };
    const nodeReader = new FileReader();
    nodeReader.onload = function (event) {
      var rawNodes = nodeReader.result.split("\r\n");
      for (element of rawNodes) {
        nodeIDToValue[element.split("\t")[0]] = element.split("\t")[1]
      }
      layoutReader.readAsText(document.getElementById("layout").files[0]);
    };
    nodeReader.readAsText(document.getElementById("node").files[0]);
    const edgeReader = new FileReader();
    edgeReader.onload = function (event) {
      edgeData = edgeReader.result.split("\r\n");
    };
    edgeReader.readAsText(document.getElementById("edge").files[0]);
  }

  document.getElementById("submit").onclick = onSubmit;
  // Get a GPU device to render with
  var adapter = await navigator.gpu.requestAdapter();
  this.device = await adapter.requestDevice();

  // Get a context to display our rendered image on the canvas
  var canvas = document.getElementById("webgpu-canvas");
  var context = canvas.getContext("gpupresent");

  // Setup shader modules
  var vertModule = device.createShaderModule({ code: simple_vert_spv });
  var vertex = {
    module: vertModule,
    entryPoint: "main",
    buffers: [
      {
        arrayStride: 4 * 4,
        attributes: [
          {
            format: "float32x4",
            offset: 0,
            shaderLocation: 0,
          }
        ],
      },
    ],
  };

  var fragModule = device.createShaderModule({ code: simple_frag_spv });

  // Specify vertex data
  // Specify vertex data
  // Allocate room for the vertex data: 3 vertices, each with 2 float4's
  var dataBuf = device.createBuffer({
    size: 6 * 4 * 4,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });

  // Create the bind group layout
  var bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        // One or more stage flags, or'd together
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "uniform",
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "storage"
        }
      },
      {
        binding: 2,
        // One or more stage flags, or'd together
        visibility: GPUShaderStage.FRAGMENT,
        texture: {}
      },
      {
        binding: 3,
        // One or more stage flags, or'd together
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {}
      },
    ],
  });

  // Create the pipeline layout, specifying which bind group layouts will be used
  var layout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  // Interleaved positions and colors
  new Float32Array(dataBuf.getMappedRange()).set([
    -1,
    -1,
    0,
    1, // position
    -1,
    1,
    0,
    1, // position
    1,
    1,
    0,
    1, // position
    -1,
    -1,
    0,
    1, // position
    1,
    -1,
    0,
    1, // position
    1,
    1,
    0,
    1, // position
  ]);
  dataBuf.unmap();

  // Create a buffer to store the view parameters
  var viewParamsBuffer = device.createBuffer({
    size: 16 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Create an Arcball camera and view projection matrix
  var camera = new ArcballCamera([0, 0, 3], [0, 0, 0], [0, 1, 0], 0.5, [
    canvas.width,
    canvas.height,
  ]);

  // Create a perspective projection matrix
  var projection = mat4.perspective(
    mat4.create(),
    (50 * Math.PI) / 180.0,
    canvas.width / canvas.height,
    0.1,
    100
  );

  // Matrix which will store the computed projection * view matrix
  var projView = mat4.create();

  // Controller utility for interacting with the canvas and driving the Arcball camera
  var controller = new Controller();
  controller.mousemove = function (prev, cur, evt) {
    if (evt.buttons == 1) {
      camera.rotate(prev, cur);
    } else if (evt.buttons == 2) {
      camera.pan([cur[0] - prev[0], prev[1] - cur[1]]);
    }
  };
  controller.wheel = function (amt) {
    camera.zoom(amt * 0.5);
  };
  controller.registerForCanvas(canvas);

  // Setup render outputs
  var swapChainFormat = "bgra8unorm";
  var swapChain = context.configureSwapChain({
    device: device,
    format: swapChainFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  var depthFormat = "depth24plus-stencil8";
  var depthTexture = device.createTexture({
    size: {
      width: canvas.width,
      height: canvas.height,
      depth: 1,
    },
    format: depthFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  var renderPipeline = device.createRenderPipeline({
    layout: layout,
    vertex: vertex,
    fragment: {
      module: fragModule,
      entryPoint: "main",
      targets: [{ format: swapChainFormat }],
    },
    primitive: {
      topology: "triangle-list",
    },
    depthStencil: {
      format: depthFormat,
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });

  // Load the default colormap and upload it
  var colormapImage = new Image();
  colormapImage.src = "colormaps/rainbow.png";
  await colormapImage.decode();
  const imageBitmap = await createImageBitmap(colormapImage);
  this.colorTexture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.SAMPLED | GPUTextureUsage.COPY_DST,
  });
  device.queue.copyImageBitmapToTexture(
    { imageBitmap },
    { texture: colorTexture },
    [imageBitmap.width, imageBitmap.height, 1]
  );


  // Render!
  var renderPassDesc = {
    colorAttachments: [
      {
        view: undefined,
        loadValue: [0.3, 0.3, 0.3, 1],
      },
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthLoadValue: 1.0,
      depthStoreOp: "store",
      stencilLoadValue: 0,
      stencilStoreOp: "store",
    },
  };

  function render() {
    // Testing
    var maxX = 0;
    var maxY = 0;
    var minX = 0;
    var minY = 0;
    for (var k = 0; k < 406; k++) {
      if (nodeData[k * 4 + 1] > maxX) {
        maxX = nodeData[k * 4 + 1];
      }
      if (nodeData[k * 4 + 1] < minX) {
        minX = nodeData[k * 4 + 1];
      }
      if (nodeData[k * 4 + 2] > maxY) {
        maxY = nodeData[k * 4 + 2];
      }
      if (nodeData[k * 4 + 2] < minY) {
        minY = nodeData[k * 4 + 2];
      }
    }

    for (var k = 0; k < 406; k++) {
      nodeData[k * 4 + 1] = -8 + (nodeData[k * 4 + 1] - minX) / (maxX - minX) * 16;
      nodeData[k * 4 + 2] = -8 + (nodeData[k * 4 + 2] - minY) / (maxY - minY) * 16;
    }

    var minValue = 0;
    var maxValue = 0;
    var values = [];
    for (var i = 0; i < 1.01; i += 0.1) {
      for (var j = 0; j < 1.01; j += 0.1) {
        var value = 0;
        for (var k = 0; k < 406; k++) {
          var sqrDistance = ((j * 60 - 30) - nodeData[k * 4 + 1]) * ((j * 60 - 30) - nodeData[k * 4 + 1]) + ((i * 60 - 30) - nodeData[k * 4 + 2]) * ((i * 60 - 30) - nodeData[k * 4 + 2]);
          value += nodeData[k * 4] / (sqrDistance + 1.0);
        }
        if (value > maxValue) {
          maxValue = value;
        }
        if (value < minValue) {
          minValue = value;
        }
        values.push(value);
      }
    }

    console.log(minValue, maxValue);
    console.log(values);

    // Create our sampler
    const sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    nodeDataBuffer = device.createBuffer({
      size: nodeData.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });

    // Create a bind group which places our view params buffer at binding 0
    var bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: {
            buffer: viewParamsBuffer,
          },
        },
        {
          binding: 1,
          resource: {
            buffer: nodeDataBuffer,
          }
        },
        {
          binding: 2,
          resource: this.colorTexture.createView(),
        },
        {
          binding: 3,
          resource: sampler,
        },
      ],
    });

    var upload = device.createBuffer({
      size: nodeData.length * 4,
      usage: GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    new Float32Array(upload.getMappedRange()).set(new Float32Array(nodeData));
    upload.unmap();

    var commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(upload, 0, nodeDataBuffer, 0, nodeData.length * 4);
    device.queue.submit([commandEncoder.finish()]);

    //render!
    var frame = function () {
      renderPassDesc.colorAttachments[0].view = swapChain
        .getCurrentTexture()
        .createView();

      // Compute and upload the combined projection and view matrix
      projView = mat4.mul(projView, projection, camera.camera);
      var upload = device.createBuffer({
        size: 16 * 4,
        usage: GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
      });
      new Float32Array(upload.getMappedRange()).set(projView);
      upload.unmap();

      var commandEncoder = device.createCommandEncoder();

      // Copy the upload buffer to our uniform buffer
      commandEncoder.copyBufferToBuffer(upload, 0, viewParamsBuffer, 0, 16 * 4);

      var renderPass = commandEncoder.beginRenderPass(renderPassDesc);

      renderPass.setPipeline(renderPipeline);
      renderPass.setVertexBuffer(0, dataBuf);
      // Set the bind group to its associated slot
      renderPass.setBindGroup(0, bindGroup);
      renderPass.draw(6, 1, 0, 0);

      renderPass.endPass();
      device.queue.submit([commandEncoder.finish()]);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
})();
