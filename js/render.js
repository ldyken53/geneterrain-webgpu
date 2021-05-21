(async () => {
  if (!navigator.gpu) {
    alert("WebGPU is not supported/enabled in your browser");
    return;
  }

  // Get a GPU device to render with
  var adapter = await navigator.gpu.requestAdapter();
  var device = await adapter.requestDevice();

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
        arrayStride: 2 * 4 * 4,
        attributes: [
          {
            format: "float32x4",
            offset: 0,
            shaderLocation: 0,
          },
          {
            format: "float32x4",
            offset: 4 * 4,
            shaderLocation: 1,
          },
        ],
      },
    ],
  };

  var fragModule = device.createShaderModule({ code: simple_frag_spv });

  // Specify vertex data
  // Specify vertex data
  // Allocate room for the vertex data: 3 vertices, each with 2 float4's
  var dataBuf = device.createBuffer({
    size: 3 * 2 * 4 * 4,
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
    ],
  });

  // Create the pipeline layout, specifying which bind group layouts will be used
  var layout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  // Interleaved positions and colors
  new Float32Array(dataBuf.getMappedRange()).set([
    1,
    -1,
    0,
    1, // position
    1,
    0,
    0,
    1, // color
    -1,
    -1,
    0,
    1, // position
    0,
    1,
    0,
    1, // color
    0,
    1,
    0,
    1, // position
    0,
    0,
    1,
    1, // color
  ]);
  dataBuf.unmap();

  // Create a buffer to store the view parameters
  var viewParamsBuffer = device.createBuffer({
    size: 16 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
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
    ],
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
    renderPass.draw(3, 1, 0, 0);

    renderPass.endPass();
    device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
