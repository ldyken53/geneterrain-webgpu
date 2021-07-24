(async () => {
  if (!navigator.gpu) {
    alert("WebGPU is not supported/enabled in your browser");
    return;
  }

  this.nodeIDToValue = {};
  this.nodeData = [];
  this.nodeDataOriginal = [];
  this.nodeElements = [];
  this.edgeElements = [];
  this.layoutData = null;
  this.widthFactor = document.getElementById("width").value;
  this.recomputeTerrain = false;
  this.translation = [0, 0, 1, 1];
  this.fontSize = 24;
  this.nodeHeight = 16;
  this.nodeWidth = 16;

  function onSubmit() {
    const edgeReader = new FileReader();
    edgeReader.onload = async function (event) {
      edgeData = edgeReader.result.split("\n");
      for (element of edgeData) {
        parts = element.split("\t");
        if (nodeIDToValue[parts[0]] && nodeIDToValue[parts[1]]) {
          nodeElements.push({ data: { source: parts[0], target: parts[1], weight: parseFloat(parts[2]) } });
        }
      }
      drawCytoscape();
      await render();
    };
    const layoutReader = new FileReader();
    layoutReader.onload = function (event) {
      console.log(nodeIDToValue);
      layoutData = layoutReader.result.split("\n");
      var i = 0;
      for (element of layoutData) {
        parts = element.split("\t");
        if (nodeIDToValue[parts[0]]) {
          // Pushes values to node data in order of struct for WebGPU:
          // nodeValue, nodeX, nodeY, nodeSize
          nodeData.push(parseFloat(nodeIDToValue[parts[0]]), parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
          // Pushes value for cytoscape
          nodeElements.push({ data: { id: parts[0], index: i, opacity: 1 }, position: { x: 1200 * parseFloat(parts[1]), y: -1200 * parseFloat(parts[2]) } });
          i += 1;
        }
      }
      edgeReader.readAsText(document.getElementById("edge").files[0]);
    };
    const nodeReader = new FileReader();
    nodeReader.onload = function (event) {
      var rawNodes = nodeReader.result.split("\n");
      console.log(rawNodes);
      for (element of rawNodes) {
        nodeIDToValue[element.split("\t")[0]] = element.split("\t")[1]
      }
      layoutReader.readAsText(document.getElementById("layout").files[0]);
    };
    nodeReader.readAsText(document.getElementById("node").files[0]);
  }

  async function onSave() {
    const gpuReadBuffer = device.createBuffer({
      size: canvas.width * canvas.height * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    var commandEncoder = device.createCommandEncoder();
    // Encode commands for copying buffer to buffer.
    commandEncoder.copyBufferToBuffer(
      terrainGenerator.pixelValueBuffer /* source buffer */,
      0 /* source offset */,
      gpuReadBuffer /* destination buffer */,
      0 /* destination offset */,
      canvas.width * canvas.height * 4 /* size */
    );

    // Submit GPU commands.
    const gpuCommands = commandEncoder.finish();
    device.queue.submit([gpuCommands]);

    // Read buffer.
    await gpuReadBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = gpuReadBuffer.getMappedRange();
    var output = new Float32Array(arrayBuffer);
    var outCanvas = document.getElementById('out-canvas');
    var context = outCanvas.getContext('2d');
    context.drawImage(colormapImage, 0, 0);
    var colorData = context.getImageData(0, 0, 180, 1).data;
    var imgData = context.createImageData(canvas.width, canvas.height);
    for (var i = 0; i < canvas.height; i++) {
      for (var j = 0; j < canvas.width; j++) {
        var index = j + i * canvas.width;
        var colorIndex = Math.trunc(output[j + (canvas.height - 1 - i) * canvas.width] * 180) * 4;
        imgData.data[index * 4] = colorData[colorIndex];
        imgData.data[index * 4 + 1] = colorData[colorIndex + 1];
        imgData.data[index * 4 + 2] = colorData[colorIndex + 2];
        imgData.data[index * 4 + 3] = colorData[colorIndex + 3];
      }
    }
    context.putImageData(imgData, 0, 0);
    outCanvas.toBlob(function (b) { saveAs(b, `terrain.png`); }, "image/png");
  }

  document.getElementById("submit").onclick = onSubmit;
  document.getElementById("save").onclick = onSave;

  // Get a context to display our rendered image on the canvas
  var canvas = document.getElementById("webgpu-canvas");
  var context = canvas.getContext("gpupresent");

  document.getElementById("overlay").onclick = () => {
    var testCanvas = document.getElementById("test-canvas");
    var destCtx = testCanvas.getContext('2d');
    destCtx.drawImage(canvas, 0, 0);
  };

  document.getElementById("hideSelected").onclick = () => {
    if (document.getElementById("hideSelected").checked) {
      for (node of cy.nodes(':selected')) {
        nodeData[node._private.data.index * 4] = 0;
        node._private.data.opacity = 0;
      }
    } else {
      for (node of cy.nodes(':selected')) {
        nodeData[node._private.data.index * 4] = nodeDataOriginal[node._private.data.index * 4];
        node._private.data.opacity = 1;
      }
    }
    reloadCytoscapeStyle();
    recomputeTerrain = true;
  }

  document.getElementById("showSelected").onclick = () => {
    if (document.getElementById("showSelected").checked) {
      for (var i = 0; i < nodeData.length; i += 4) {
        nodeData[i] = 0;
      }
      for (node of cy.nodes()) {
        node._private.data.opacity = 0;
      }
      for (node of cy.nodes(':selected')) {
        nodeData[node._private.data.index * 4] = nodeDataOriginal[node._private.data.index * 4];
        node._private.data.opacity = 1;
      }
    } else {
      for (var i = 0; i < nodeData.length; i += 4) {
        nodeData[i] = nodeDataOriginal[i];
      }
      for (node of cy.nodes()) {
        node._private.data.opacity = 1;
      }
    }
    reloadCytoscapeStyle();
    recomputeTerrain = true;
  }

  document.getElementById("width").oninput = () => {
    var width = document.getElementById("width").value;
    // if (width > 10) {
    //   width = width - 9;
    // } else {
    //   width = width / 10;
    // }
    widthFactor = width;
    recomputeTerrain = true;
  }

  function reloadCytoscapeStyle() {
    if (cy) {
      cy.style([{
        selector: 'node',
        css: {
          'content': 'data(id)',
          'font-size': fontSize,
          'text-valign': 'top',
          'text-halign': 'center',
          'height': nodeHeight,
          'width': nodeWidth,
          'background-opacity': 1,
          'border-width': 1,
          'border-color': 'gray',
          'opacity': 'data(opacity)'
        }
      },
      {
        selector: ':selected',
        css: {
          'background-color': 'SteelBlue',
          'line-color': 'black',
          'target-arrow-color': 'black',
          'source-arrow-color': 'black',
        }
      },
      {
        selector: 'edge',
        css: {
          'width': 'data(weight)',
          'line-color': 'gray'
        },
      }
      ]);
    }
  }

  document.getElementById("edges").onclick = () => {
    if (document.getElementById("edges").checked) {
      edgeElements.restore();
    } else {
      edgeElements = edgeElements.remove();
    }
    reloadCytoscapeStyle();
  };

  // Get a GPU device to render with
  var adapter = await navigator.gpu.requestAdapter();
  var device = await adapter.requestDevice();

  var terrainGenerator = new TerrainGenerator(device, canvas);

  var vertModule3D = device.createShaderModule({ code: display_terrain_3d_vert_spv });
  var fragModule3D = device.createShaderModule({ code: display_terrain_3d_frag_spv });
  var vertModule2D = device.createShaderModule({ code: display_terrain_2d_vert_spv });
  var fragModule2D = device.createShaderModule({ code: display_terrain_2d_frag_spv });

  // Setup shader modules
  var vertex3D = {
    module: vertModule3D,
    entryPoint: "main",
    buffers: [
      {
        arrayStride: 3 * 4,
        attributes: [
          {
            format: "float32x3",
            offset: 0,
            shaderLocation: 0,
          },
        ],
      },
    ],
  };
  var vertex2D = {
    module: vertModule2D,
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

  // Create the bind group layout
  var displayTerrain3DBGLayout = device.createBindGroupLayout({
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
        // One or more stage flags, or'd together
        visibility: GPUShaderStage.FRAGMENT,
        texture: {}
      },
      {
        binding: 2,
        // One or more stage flags, or'd together
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {}
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "storage"
        }
      },
      {
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform",
        },
      }
    ],
  });
  var displayTerrain2DBGLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        // One or more stage flags, or'd together
        visibility: GPUShaderStage.FRAGMENT,
        texture: {}
      },
      {
        binding: 1,
        // One or more stage flags, or'd together
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {}
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "storage"
        }
      },
      {
        binding: 3,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "uniform",
        },
      }
    ],
  });

  // Specify vertex data
  var dataBuf3D = device.createBuffer({
    size: 12 * 3 * 3 * 4,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(dataBuf3D.getMappedRange()).set([
    1, 0, 0, 0, 0, 0, 1, 1, 0,

    0, 1, 0, 1, 1, 0, 0, 0, 0,

    1, 0, 1, 1, 0, 0, 1, 1, 1,

    1, 1, 0, 1, 1, 1, 1, 0, 0,

    0, 0, 1, 1, 0, 1, 0, 1, 1,

    1, 1, 1, 0, 1, 1, 1, 0, 1,

    0, 0, 0, 0, 0, 1, 0, 1, 0,

    0, 1, 1, 0, 1, 0, 0, 0, 1,

    1, 1, 0, 0, 1, 0, 1, 1, 1,

    0, 1, 1, 1, 1, 1, 0, 1, 0,

    0, 0, 1, 0, 0, 0, 1, 0, 1,

    1, 0, 0, 1, 0, 1, 0, 0, 0,
  ]);
  dataBuf3D.unmap();
  var dataBuf2D = device.createBuffer({
    size: 6 * 4 * 4,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true
  });
  // Interleaved positions and colors
  new Float32Array(dataBuf2D.getMappedRange()).set([
    1, -1, 0, 1,  // position
    -1, -1, 0, 1, // position
    -1, 1, 0, 1,   // position
    1, -1, 0, 1,  // position
    -1, 1, 0, 1, // position
    1, 1, 0, 1,   // position
  ]);
  dataBuf2D.unmap();

  // Create a buffer to store the view parameters
  var viewParamsBuffer = device.createBuffer({
    size: 20 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  var imageSizeBuffer = device.createBuffer({
    size: 2 * 4,
    usage: GPUBufferUsage.UNIFORM,
    mappedAtCreation: true
  });
  new Uint32Array(imageSizeBuffer.getMappedRange()).set([canvas.width, canvas.height]);
  imageSizeBuffer.unmap();

  var translationBuffer = device.createBuffer({
    size: 2 * 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

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

  // Create render pipeline
  var layout3D = device.createPipelineLayout({
    bindGroupLayouts: [displayTerrain3DBGLayout],
  });
  var layout2D = device.createPipelineLayout({
    bindGroupLayouts: [displayTerrain2DBGLayout],
  });

  var renderPipeline3D = device.createRenderPipeline({
    layout: layout3D,
    vertex: vertex3D,
    fragment: {
      module: fragModule3D,
      entryPoint: "main",
      targets: [
        {
          format: swapChainFormat
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
      cullMode: "front",
    },
    depthStencil: {
      format: depthFormat,
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });
  var renderPipeline2D = device.createRenderPipeline({
    layout: layout2D,
    vertex: vertex2D,
    fragment: {
      module: fragModule2D,
      entryPoint: "main",
      targets: [
        {
          format: swapChainFormat
        },
      ],
    },
    primitive: {
      topology: 'triangle-list',
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
  var colorTexture = device.createTexture({
    size: [imageBitmap.width, imageBitmap.height, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.SAMPLED | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: imageBitmap },
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

  var cy = null;

  function drawCytoscape() {
    cy = cytoscape({
      minZoom: 1e-1,
      maxZoom: 1e1,
      wheelSensitivity: 0.1,
      container: document.getElementById('cy'),
      layout: {
        name: 'preset'
      },
      style: [{
        selector: 'node',
        css: {
          'content': 'data(id)',
          'text-valign': 'top',
          'text-halign': 'center',
          'font-size': fontSize,
          'height': nodeHeight,
          'width': nodeWidth,
          'background-opacity': 1,
          'border-width': 1,
          'border-color': 'gray',
          'opacity': 'data(opacity)'
        }
      },
      {
        selector: ':selected',
        css: {
          'background-color': 'SteelBlue',
          'line-color': 'black',
          'target-arrow-color': 'black',
          'source-arrow-color': 'black',
        }
      },
      {
        selector: 'edge',
        css: {
          'width': 'data(weight)',
          'line-color': 'gray'
        },
      }
      ],
      elements: this.nodeElements
    });
    cy.nodes().on('dragfreeon', reloadNodeData);
    edgeElements = cy.edges().remove();
  }

  async function reloadViewBox(event) {
    // var upload = device.createBuffer({
    //   size: 2 * 4,
    //   usage: GPUBufferUsage.COPY_SRC,
    //   mappedAtCreation: true,
    // });
    // new Float32Array(upload.getMappedRange()).set([cy.extent().x1 / 1200.0, cy.extent().y2 / -1200.0]);
    // upload.unmap();
    translation = [cy.extent().x1 / 1200.0, cy.extent().y2 / -1200.0, cy.extent().x2 / 1200.0, cy.extent().y1 / -1200.0];
    recomputeTerrain = true;
    fontSize = (1 / cy.zoom()) * 0.5 * 24;
    nodeHeight = (1 / cy.zoom()) * 0.5 * 16;
    nodeWidth = (1 / cy.zoom()) * 0.5 * 16;
    reloadCytoscapeStyle();
    // var commandEncoder = device.createCommandEncoder();
    // commandEncoder.copyBufferToBuffer(upload, 0, translationBuffer, 0, 2 * 4);
    // device.queue.submit([commandEncoder.finish()]);
  }

  async function reloadNodeData(event) {
    var x = event.target._private.position.x / 1200;
    var y = event.target._private.position.y / -1200;

    console.log(nodeData[event.target._private.data.index * 4], x, y);
    nodeData[event.target._private.data.index * 4 + 1] = x;
    nodeData[event.target._private.data.index * 4 + 2] = y;

    recomputeTerrain = true;
    // var upload = device.createBuffer({
    //   size: nodeData.length * 4,
    //   usage: GPUBufferUsage.COPY_SRC,
    //   mappedAtCreation: true,
    // });
    // new Float32Array(upload.getMappedRange()).set(new Float32Array(nodeData));
    // upload.unmap();

    // var commandEncoder = device.createCommandEncoder();
    // commandEncoder.copyBufferToBuffer(upload, 0, nodeDataBuffer, 0, nodeData.length * 4);
    // device.queue.submit([commandEncoder.finish()]);

  }

  async function render() {
    console.log(nodeData);
    nodeDataOriginal = [...nodeData];
    // for (var k = 0; k < 406; k++) {
    //   if (nodeData[k * 4 + 1] > maxX) {
    //     maxX = nodeData[k * 4 + 1];
    //   }
    //   if (nodeData[k * 4 + 1] < minX) {
    //     minX = nodeData[k * 4 + 1];
    //   }
    //   if (nodeData[k * 4 + 2] > maxY) {
    //     maxY = nodeData[k * 4 + 2];
    //   }
    //   if (nodeData[k * 4 + 2] < minY) {
    //     minY = nodeData[k * 4 + 2];
    //   }
    // }
    // console.log(minX, maxX, minY, maxY);

    // for (var k = 0; k < 406; k++) {
    //   nodeData[k * 4 + 1] = -8 + (nodeData[k * 4 + 1] - minX) / (maxX - minX) * 16;
    //   nodeData[k * 4 + 2] = -8 + (nodeData[k * 4 + 2] - minY) / (maxY - minY) * 16;
    // }

    // for (var k = 0; k < 406; k++) {
    //   nodeData[k * 4 + 1] = (nodeData[k * 4 + 1] - minX) / (maxX - minX);
    //   nodeData[k * 4 + 2] = (nodeData[k * 4 + 2] - minY) / (maxY - minY);
    // }

    await terrainGenerator.computeTerrain(nodeData, widthFactor, translation);

    const rangeBuffer = device.createBuffer({
      size: 2 * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    var commandEncoder = device.createCommandEncoder();
    // Encode commands for copying buffer to buffer.
    commandEncoder.copyBufferToBuffer(
      terrainGenerator.rangeBuffer /* source buffer */,
      0 /* source offset */,
      rangeBuffer /* destination buffer */,
      0 /* destination offset */,
      2 * 4 /* size */
    );

    // Submit GPU commands.
    device.queue.submit([commandEncoder.finish()]);

    // Read buffer.
    await rangeBuffer.mapAsync(GPUMapMode.READ);
    console.log(new Int32Array(rangeBuffer.getMappedRange()));

    // // Testing
    // var minValue = 0;
    // var maxValue = 0;
    // var values = [];
    // for (var i = 0; i < 600; i += 1) {
    //   for (var j = 0; j < 600; j += 1) {
    //     var value = 0;
    //     for (var k = 0; k < 406; k++) {
    //       var sqrDistance = (j / 600 - nodeData[k * 4 + 1]) * (j / 600 - nodeData[k * 4 + 1]) + (i / 600 - nodeData[k * 4 + 2]) * (i / 600 - nodeData[k * 4 + 2]);
    //       value += nodeData[k * 4] / (sqrDistance + 1.0);
    //     }
    //     if (value > maxValue) {
    //       maxValue = value;
    //     }
    //     if (value < minValue) {
    //       minValue = value;
    //     }
    //     values.push(value);
    //   }
    // }
    // console.log(values);
    // console.log(minValue, maxValue);

    // Create our sampler
    const sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });
    cy.reset();
    cy.zoom(0.5);
    cy.panBy({ x: 0, y: 600 });
    cy.on('pan', reloadViewBox);
    var overlayCanvas = document.querySelector("[data-id='layer2-node']");
    //render!
    var frame = async function () {
      if (document.getElementById("overlay").checked) {
        var outCanvas = document.getElementById('out-canvas');
        var context = outCanvas.getContext('2d');
        context.drawImage(overlayCanvas, 0, 0);
      }

      if (recomputeTerrain) {
        await terrainGenerator.computeTerrain(nodeData, widthFactor, translation);
        recomputeTerrain = false;
      }

      if (document.getElementById("3d").checked) {
        var bindGroup = device.createBindGroup({
          layout: displayTerrain3DBGLayout,
          entries: [
            {
              binding: 0,
              resource: {
                buffer: viewParamsBuffer,
              },
            },
            {
              binding: 1,
              resource: colorTexture.createView(),
            },
            {
              binding: 2,
              resource: sampler,
            },
            {
              binding: 3,
              resource: {
                buffer: terrainGenerator.pixelValueBuffer,
              }
            },
            {
              binding: 4,
              resource: {
                buffer: imageSizeBuffer,
              }
            }
          ],
        });

        renderPassDesc.colorAttachments[0].view = swapChain
          .getCurrentTexture()
          .createView();

        // Compute and upload the combined projection and view matrix
        projView = mat4.mul(projView, projection, camera.camera);
        var upload = device.createBuffer({
          size: 20 * 4,
          usage: GPUBufferUsage.COPY_SRC,
          mappedAtCreation: true,
        });
        var map = new Float32Array(upload.getMappedRange());
        map.set(projView);
        map.set(camera.eyePos(), 16);
        upload.unmap();

        var commandEncoder = device.createCommandEncoder();

        // Copy the upload buffer to our uniform buffer
        commandEncoder.copyBufferToBuffer(upload, 0, viewParamsBuffer, 0, 20 * 4);

        var renderPass = commandEncoder.beginRenderPass(renderPassDesc);

        renderPass.setPipeline(renderPipeline3D);
        renderPass.setVertexBuffer(0, dataBuf3D);
        // Set the bind group to its associated slot
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(12 * 3, 1, 0, 0);

        renderPass.endPass();
        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(frame);
      }
      else {
        var bindGroup = device.createBindGroup({
          layout: displayTerrain2DBGLayout,
          entries: [
            {
              binding: 0,
              resource: colorTexture.createView(),
            },
            {
              binding: 1,
              resource: sampler,
            },
            {
              binding: 2,
              resource: {
                buffer: terrainGenerator.pixelValueBuffer,
              }
            },
            {
              binding: 3,
              resource: {
                buffer: translationBuffer,
              }
            }
          ],
        });

        renderPassDesc.colorAttachments[0].view = swapChain
          .getCurrentTexture()
          .createView();

        var commandEncoder = device.createCommandEncoder();

        var renderPass = commandEncoder.beginRenderPass(renderPassDesc);

        renderPass.setPipeline(renderPipeline2D);
        renderPass.setVertexBuffer(0, dataBuf2D);
        // Set the bind group to its associated slot
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(6, 1, 0, 0);

        renderPass.endPass();
        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(frame);
      }

    };
    requestAnimationFrame(frame);
  }
})();
