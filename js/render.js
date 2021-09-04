(async () => {
  if (!navigator.gpu) {
    alert("WebGPU is not supported/enabled in your browser");
    return;
  }

  this.nodeIDToValue = [{}, {}];
  this.nodeData = [[], []];
  this.nodeDataOriginal = [[], []];
  this.nodeElements = [[], []];
  this.edgeElements = [[], []];
  this.layoutData = null;
  this.widthFactor = [document.getElementById("width").value, document.getElementById("width2").value];
  this.recomputeTerrain = [false, false];
  this.recomputeSubtract = false;
  this.translation = [[0, 0, 1, 1], [0, 0, 1, 1]];
  this.fontSize = [24, 24];
  this.nodeHeight = [16, 16];
  this.nodeWidth = [16, 16];

  function onSubmit(nodeElements, nodeData, nodeIDToValue, index) {
    const edgeReader = new FileReader();
    edgeReader.onload = async function (event) {
      edgeData = edgeReader.result.split("\n");
      for (element of edgeData) {
        parts = element.split("\t");
        if (nodeIDToValue[parts[0]] && nodeIDToValue[parts[1]]) {
          nodeElements.push({ data: { source: parts[0], target: parts[1], weight: parseFloat(parts[2]) } });
        }
      }
      drawCytoscape(index);
      await render(nodeData, index);
    };
    const layoutReader = new FileReader();
    layoutReader.onload = function (event) {
      layoutData = layoutReader.result.split("\n");
      var i = 0;
      for (element of layoutData) {
        parts = element.split("\t");
        if (nodeIDToValue[parts[0]]) {
          // Pushes values to node data in order of struct for WebGPU:
          // nodeValue, nodeX, nodeY, nodeSize
          nodeData.push(parseFloat(nodeIDToValue[parts[0]]), parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
          // Pushes value for cytoscape
          nodeElements.push({ data: { id: parts[0], index: i, opacity: 1, color: 'gray' }, position: { x: 1200 * parseFloat(parts[1]), y: -1200 * parseFloat(parts[2]) } });
          i += 1;
        }
      }
      edgeReader.readAsText(document.getElementById("edge").files[0]);
    };
    const nodeReader = new FileReader();
    nodeReader.onload = function (event) {
      var rawNodes = nodeReader.result.split("\n");
      for (element of rawNodes) {
        nodeIDToValue[element.split("\t")[0]] = element.split("\t")[1]
      }
      layoutReader.readAsText(document.getElementById("layout").files[0]);
    };
    nodeReader.readAsText(document.getElementById("node").files[0]);
  }

  async function onSave(index) {
    var height = canvas[index].height;
    var width = canvas[index].width;
    const gpuReadBuffer = device.createBuffer({
      size: width * height * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    var commandEncoder = device.createCommandEncoder();
    // Encode commands for copying buffer to buffer.
    commandEncoder.copyBufferToBuffer(
      terrainGenerator[index].pixelValueBuffer /* source buffer */,
      0 /* source offset */,
      gpuReadBuffer /* destination buffer */,
      0 /* destination offset */,
      width * height * 4 /* size */
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
    var imgData = context.createImageData(width, height);
    for (var i = 0; i < height; i++) {
      for (var j = 0; j < width; j++) {
        var index = j + i * width;
        var colorIndex = Math.trunc(output[j + (height - 1 - i) * width] * 180) * 4;
        imgData.data[index * 4] = colorData[colorIndex];
        imgData.data[index * 4 + 1] = colorData[colorIndex + 1];
        imgData.data[index * 4 + 2] = colorData[colorIndex + 2];
        imgData.data[index * 4 + 3] = colorData[colorIndex + 3];
      }
    }
    context.putImageData(imgData, 0, 0);
    outCanvas.toBlob(function (b) { saveAs(b, `terrain.png`); }, "image/png");
  }

  document.getElementById("submit").onclick = function () { onSubmit(nodeElements[0], nodeData[0], nodeIDToValue[0], 0); };
  document.getElementById("submit2").onclick = function () { onSubmit(nodeElements[1], nodeData[1], nodeIDToValue[1], 1); };
  document.getElementById("save").onclick = function () { onSave(0) };
  document.getElementById("save2").onclick = function () { onSave(1) };


  // Get a context to display our rendered image on the canvas
  var canvas = [document.getElementById("webgpu-canvas"), document.getElementById("webgpu-canvas-2")];
  var context = [canvas[0].getContext("webgpu"), canvas[1].getContext("webgpu")];

  document.getElementById("overlay").onclick = () => {
    var overlay = 0;
    if (document.getElementById("overlay").checked) {
      overlay = 1;
    }
    var upload = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    var map = new Uint32Array(upload.getMappedRange());
    map.set([overlay]);
    upload.unmap();

    var commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(upload, 0, overlayBoolBuffer[0], 0, 4);
    device.queue.submit([commandEncoder.finish()]);
  };

  document.getElementById("overlay2").onclick = () => {
    var overlay = 0;
    if (document.getElementById("overlay2").checked) {
      overlay = 1;
    }
    var upload = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.COPY_SRC,
      mappedAtCreation: true,
    });
    var map = new Uint32Array(upload.getMappedRange());
    map.set([overlay]);
    upload.unmap();

    var commandEncoder = device.createCommandEncoder();
    commandEncoder.copyBufferToBuffer(upload, 0, overlayBoolBuffer[1], 0, 4);
    device.queue.submit([commandEncoder.finish()]);
  };

  document.getElementById("hideSelected").onclick = () => {
    if (document.getElementById("hideSelected").checked) {
      for (node of cy[0].nodes(':selected')) {
        nodeData[0][node._private.data.index * 4] = 0;
        node._private.data.opacity = 0;
      }
    } else {
      for (node of cy[0].nodes(':selected')) {
        nodeData[0][node._private.data.index * 4] = nodeDataOriginal[0][node._private.data.index * 4];
        node._private.data.opacity = 1;
      }
    }
    recomputeTerrain[0] = true;
  }

  document.getElementById("hideSelected2").onclick = () => {
    if (document.getElementById("hideSelected2").checked) {
      for (node of cy[1].nodes(':selected')) {
        nodeData[1][node._private.data.index * 4] = 0;
        node._private.data.opacity = 0;
      }
    } else {
      for (node of cy[1].nodes(':selected')) {
        nodeData[1][node._private.data.index * 4] = nodeDataOriginal[1][node._private.data.index * 4];
        node._private.data.opacity = 1;
      }
    }
    recomputeTerrain[1] = true;
  }

  document.getElementById("showSelected").onclick = () => {
    if (document.getElementById("showSelected").checked) {
      for (var i = 0; i < nodeData[0].length; i += 4) {
        nodeData[0][i] = 0;
      }
      for (node of cy[0].nodes()) {
        node._private.data.opacity = 0;
      }
      for (node of cy[0].nodes(':selected')) {
        nodeData[0][node._private.data.index * 4] = nodeDataOriginal[0][node._private.data.index * 4];
        node._private.data.opacity = 1;
      }
    } else {
      for (var i = 0; i < nodeData[0].length; i += 4) {
        nodeData[0][i] = nodeDataOriginal[0][i];
      }
      for (node of cy[0].nodes()) {
        node._private.data.opacity = 1;
      }
    }
    recomputeTerrain[0] = true;
  }

  document.getElementById("showSelected2").onclick = () => {
    if (document.getElementById("showSelected2").checked) {
      for (var i = 0; i < nodeData[1].length; i += 4) {
        nodeData[1][i] = 0;
      }
      for (node of cy[1].nodes()) {
        node._private.data.opacity = 0;
      }
      for (node of cy[1].nodes(':selected')) {
        nodeData[1][node._private.data.index * 4] = nodeDataOriginal[1][node._private.data.index * 4];
        node._private.data.opacity = 1;
      }
    } else {
      for (var i = 0; i < nodeData[1].length; i += 4) {
        nodeData[1][i] = nodeDataOriginal[1][i];
      }
      for (node of cy[1].nodes()) {
        node._private.data.opacity = 1;
      }
    }
    recomputeTerrain[1] = true;
  }

  document.getElementById("width").oninput = () => {
    var width = document.getElementById("width").value;
    // if (width > 10) {
    //   width = width - 9;
    // } else {
    //   width = width / 10;
    // }
    widthFactor[0] = width;
    recomputeTerrain[0] = true;
  }

  document.getElementById("width2").oninput = () => {
    var width = document.getElementById("width2").value;
    // if (width > 10) {
    //   width = width - 9;
    // } else {
    //   width = width / 10;
    // }
    widthFactor[1] = width;
    recomputeTerrain[1] = true;
  }

  function reloadCytoscapeStyle(index) {
    if (cy[index]) {
      cy[index].style([{
        selector: 'node',
        css: {
          'content': 'data(id)',
          'font-size': fontSize[index],
          'text-valign': 'top',
          'text-halign': 'center',
          'height': nodeHeight[index],
          'width': nodeWidth[index],
          'background-opacity': 1,
          'border-width': 1,
          'border-color': 'gray',
          'opacity': 'data(opacity)',
          'background-color': `data(color)`,
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
      edgeElements[0].restore();
    } else {
      edgeElements[0] = edgeElements[0].remove();
    }
    reloadCytoscapeStyle(0);
  };

  document.getElementById("edges2").onclick = () => {
    if (document.getElementById("edges2").checked) {
      edgeElements[1].restore();
    } else {
      edgeElements[1] = edgeElements[1].remove();
    }
    reloadCytoscapeStyle(1);
  };

  // Get a GPU device to render with
  var adapter = await navigator.gpu.requestAdapter();
  var device = await adapter.requestDevice();

  var terrainGenerator = [new TerrainGenerator(device, [600, 600]), new TerrainGenerator(device, [600, 600])];

  var subtractCanvas = document.getElementById("subtract-canvas");
  var terrainSubtracter = new TerrainSubtracter(device, subtractCanvas);
  var subtractContext = subtractCanvas.getContext("webgpu");

  var vertModule3D = device.createShaderModule({ code: display_3d_vert });
  var fragModule3D = device.createShaderModule({ code: display_3d_frag });
  var vertModule2D = device.createShaderModule({ code: display_2d_vert });
  var fragModule2D = device.createShaderModule({ code: display_2d_frag });

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
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "storage"
        }
      },
      {
        binding: 3,
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
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "storage"
        }
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: {}
      },
      {
        binding: 3,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform"
        }
      },
      {
        binding: 4,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform"
        }
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
  new Uint32Array(imageSizeBuffer.getMappedRange()).set([600, 600]);
  imageSizeBuffer.unmap();

  var overlayBoolBuffer = [];
  var overlayCanvas = [];
  var overlayTexture = [];

  // Setup render outputs
  var swapChainFormat = "bgra8unorm";
  context[0].configure({
    device: device,
    format: swapChainFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  context[1].configure({
    device: device,
    format: swapChainFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });
  subtractContext.configure({
    device: device,
    format: swapChainFormat,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  });

  var depthFormat = "depth24plus-stencil8";
  var depthTexture = device.createTexture({
    size: {
      width: canvas[0].width,
      height: canvas[0].height,
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
    canvas[0].width,
    canvas[0].height,
  ]);

  // Create a perspective projection matrix
  var projection = mat4.perspective(
    mat4.create(),
    (50 * Math.PI) / 180.0,
    canvas[0].width / canvas[0].height,
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
  controller.registerForCanvas(canvas[0]);

  var cy = [null, null];

  function drawCytoscape(index) {
    cy[index] = cytoscape({
      minZoom: 1e-1,
      maxZoom: 1e1,
      wheelSensitivity: 0.1,
      container: document.getElementById(`cy${index == 1 ? "2" : ""}`),
      layout: {
        name: 'preset'
      },
      style: [{
        selector: 'node',
        css: {
          'content': 'data(id)',
          'text-valign': 'top',
          'text-halign': 'center',
          'font-size': fontSize[index],
          'height': nodeHeight[index],
          'width': nodeWidth[index],
          'background-opacity': 1,
          'border-width': 1,
          'border-color': 'gray',
          'opacity': 'data(opacity)',
          'background-color': 'data(color)',
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
      elements: nodeElements[index]
    });
    cy[index].nodes().on('dragfreeon', function (event) { reloadNodeData(event, nodeData[index]) });
    edgeElements[index] = cy[index].edges().remove();
  }

  async function reloadViewBox(event, index) {
    translation[index] = [cy[index].extent().x1 / 1200.0, cy[index].extent().y2 / -1200.0, cy[index].extent().x2 / 1200.0, cy[index].extent().y1 / -1200.0];
    if (document.getElementById("synch").checked) {
      translation[1] = [cy[index].extent().x1 / 1200.0, cy[index].extent().y2 / -1200.0, cy[index].extent().x2 / 1200.0, cy[index].extent().y1 / -1200.0];
      cy[1].zoom(cy[index].zoom());
      cy[1].pan(cy[index].pan());
      recomputeTerrain[1] = true;
    }
    recomputeTerrain[index] = true;
    fontSize[index] = (1 / cy[index].zoom()) * 0.5 * 24;
    nodeHeight[index] = (1 / cy[index].zoom()) * 0.5 * 16;
    nodeWidth[index] = (1 / cy[index].zoom()) * 0.5 * 16;
    // reloadCytoscapeStyle();
    // var commandEncoder = device.createCommandEncoder();
    // commandEncoder.copyBufferToBuffer(upload, 0, translationBuffer, 0, 2 * 4);
    // device.queue.submit([commandEncoder.finish()]);
  }

  async function reloadNodeData(event, nodeData) {
    var x = event.target._private.position.x / 1200;
    var y = event.target._private.position.y / -1200;

    console.log(nodeData[event.target._private.data.index * 4], x, y);
    nodeData[event.target._private.data.index * 4 + 1] = x;
    nodeData[event.target._private.data.index * 4 + 2] = y;

    recomputeTerrain[index] = true;
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

  document.getElementById("aFactor").oninput = function () {
    recomputeSubtract = true;
  }

  document.getElementById("bFactor").oninput = function () {
    recomputeSubtract = true;
  }

  document.getElementById("subtract").onclick = async function () {
    var aFactor = parseFloat(document.getElementById("aFactor").value);
    var bFactor = parseFloat(document.getElementById("bFactor").value);
    await terrainSubtracter.subtractTerrain(terrainGenerator[0].pixelValueBuffer, terrainGenerator[1].pixelValueBuffer, aFactor, bFactor);
    recomputeSubtract = false;
    document.getElementById("compare-label").innerText = `Mean Squared Error: ${terrainSubtracter.MSE}`;
    var maxDiff = [0, 0, 0, 0, 0];
    var absMaxDiff = [0, 0, 0, 0, 0];
    var indices = [0, 0, 0, 0, 0];
    var id = ["", "", "", "", ""];
    for (element of nodeElements[0]) {
      var diff = nodeIDToValue[0][element.data.id] - nodeIDToValue[1][element.data.id];
      var absMin = Math.min(...absMaxDiff);
      if (Math.abs(diff) > absMin) {
        var absMindex = absMaxDiff.indexOf(absMin);
        indices[absMindex] = element.data.index;
        id[absMindex] = element.data.id;
        absMaxDiff[absMindex] = Math.abs(diff);
        maxDiff[absMindex] = diff;
      }
    }
    var diffString = "Max Gene Differences\n";
    for (var i = 0; i < 5; i++) {
      nodeElements[0][indices[i]].data.color = "red";
      nodeElements[1][indices[i]].data.color = "red";
      diffString += `${id[i]}: ${maxDiff[i]}\n`
    }
    document.getElementById("node-difference").value = diffString;
    requestAnimationFrame(subtractFrame);
  };

  var subtractFrame = async function () {
    if (recomputeSubtract) {
      var aFactor = parseFloat(document.getElementById("aFactor").value);
      var bFactor = parseFloat(document.getElementById("bFactor").value);
      start = performance.now()
      await terrainSubtracter.subtractTerrain(terrainGenerator[0].pixelValueBuffer, terrainGenerator[1].pixelValueBuffer, aFactor, bFactor);
      console.log(performance.now() - start);
      document.getElementById("compare-label").innerText = `Mean Squared Error: ${terrainSubtracter.MSE}`;
      recomputeSubtract = false;
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
            resource: {
              buffer: terrainSubtracter.pixelValueBuffer,
            }
          },
          {
            binding: 3,
            resource: {
              buffer: imageSizeBuffer,
            }
          }
        ],
      });

      renderPassDesc.colorAttachments[0].view = subtractContext.getCurrentTexture().createView();

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
            resource: {
              buffer: terrainSubtracter.pixelValueBuffer,
            }
          },
          {
            binding: 2,
            resource: overlayTexture[0].createView(),
          },
          {
            binding: 3,
            resource: {
              buffer: overlayBoolBuffer[0],
            }
          },
          {
            binding: 4,
            resource: {
              buffer: imageSizeBuffer
            }
          }
        ],
      });

      renderPassDesc.colorAttachments[0].view = subtractContext.getCurrentTexture().createView();

      var commandEncoder = device.createCommandEncoder();

      var renderPass = commandEncoder.beginRenderPass(renderPassDesc);

      renderPass.setPipeline(renderPipeline2D);
      renderPass.setVertexBuffer(0, dataBuf2D);
      // Set the bind group to its associated slot
      renderPass.setBindGroup(0, bindGroup);
      renderPass.draw(6, 1, 0, 0);

      renderPass.endPass();
      device.queue.submit([commandEncoder.finish()]);
    }
    requestAnimationFrame(subtractFrame);
  }

  async function render(nodeData, index) {
    nodeDataOriginal[index] = [...nodeData];
    // var maxX = 0;
    // var minX = 0;
    // var minY = 0;
    // var maxY = 0;
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

    await terrainGenerator[index].computeTerrain(nodeData, widthFactor[index], translation[index]);

    const rangeBuffer = device.createBuffer({
      size: 2 * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    });
    var commandEncoder = device.createCommandEncoder();
    // Encode commands for copying buffer to buffer.
    commandEncoder.copyBufferToBuffer(
      terrainGenerator[index].rangeBuffer /* source buffer */,
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

    // Set up overlay
    overlayBoolBuffer[index] = device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    overlayCanvas[index] = document.querySelectorAll("[data-id='layer2-node']")[index];
    overlayTexture[index] = device.createTexture({
      size: [overlayCanvas[index].width, overlayCanvas[index].height, 1],
      format: "rgba8unorm",
      usage: GPUTextureUsage.SAMPLED | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });

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
    cy[index].reset();
    cy[index].zoom(0.5);
    cy[index].panBy({ x: 0, y: 600 });
    cy[index].on('pan', function (event) { reloadViewBox(event, index); });
    //render!
    var frame = async function () {
      reloadCytoscapeStyle(index);
      if (document.getElementById(`overlay${index > 0 ? "2" : ""}`).checked) {
        // Setup overlay
        var overlayImage = new Image();
        overlayImage.src = overlayCanvas[index].toDataURL();
        await overlayImage.decode();
        const imageBitmap = await createImageBitmap(overlayImage);
        device.queue.copyExternalImageToTexture(
          { source: imageBitmap },
          { texture: overlayTexture[index] },
          [imageBitmap.width, imageBitmap.height, 1]
        );
      }

      if (recomputeTerrain[index]) {
        start = performance.now()
        await terrainGenerator[index].computeTerrain(nodeData, widthFactor[index], translation[index]);
        console.log(performance.now() - start);
        recomputeSubtract = true;
        recomputeTerrain[index] = false;
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
              resource: {
                buffer: terrainGenerator[index].pixelValueBuffer,
              }
            },
            {
              binding: 3,
              resource: {
                buffer: imageSizeBuffer,
              }
            }
          ],
        });

        renderPassDesc.colorAttachments[0].view = context[index].getCurrentTexture().createView();

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
              resource: {
                buffer: terrainGenerator[index].pixelValueBuffer,
              }
            },
            {
              binding: 2,
              resource: overlayTexture[index].createView(),
            },
            {
              binding: 3,
              resource: {
                buffer: overlayBoolBuffer[index],
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

        renderPassDesc.colorAttachments[0].view = context[index].getCurrentTexture().createView();

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
