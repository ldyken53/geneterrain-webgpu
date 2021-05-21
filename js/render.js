(async () => {
  if (!navigator.gpu) {
    alert("WebGPU is not supported/enabled in your browser");
    return;
  }

  var adapter = await navigator.gpu.requestAdapter();

  var device = await adapter.requestDevice();

  var canvas = document.getElementById("webgpu-canvas");
  var context = canvas.getContext("gpupresent");

  // Setup shader modules
  var vertModule = device.createShaderModule({ code: simple_vert_spv });

  var fragModule = device.createShaderModule({ code: simple_frag_spv });

  // Specify vertex data
  var dataBuf = device.createBuffer({
    size: 12 * 3 * 3 * 4,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(dataBuf.getMappedRange()).set([
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
  dataBuf.unmap();

  var colorBuf = device.createBuffer({
    size: 12 * 3 * 3 * 4,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(colorBuf.getMappedRange()).set([
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,

    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

    1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0,

    0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1,
  ]);
  colorBuf.unmap();

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

  // Create the bind group layout
  var bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "uniform",
        },
      },
    ],
  });

  // Create render pipeline
  var layout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  var renderPipeline = device.createRenderPipeline({
    layout: layout,
    vertex: {
      module: vertModule,
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
        {
          arrayStride: 3 * 4,
          attributes: [
            {
              format: "float32x3",
              offset: 0,
              shaderLocation: 1,
            },
          ],
        },
      ],
    },
    fragment: {
      module: fragModule,
      entryPoint: "main",
      targets: [
        {
          format: swapChainFormat,
        },
      ],
    },
    depthStencil: {
      format: depthFormat,
      depthWriteEnabled: true,
      depthCompare: "less",
    },
  });

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

  // Create a buffer to store the view parameters
  var viewParamsBuffer = device.createBuffer({
    size: 20 * 4,
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

  // Create an arcball camera and view projection matrix
  var camera = new ArcballCamera([0, 0, 3], [0, 0, 0], [0, 1, 0], 0.5, [
    canvas.width,
    canvas.height,
  ]);
  var projection = mat4.perspective(
    mat4.create(),
    (50 * Math.PI) / 180.0,
    canvas.width / canvas.height,
    0.1,
    100
  );
  // Matrix which will store the computed projection * view matrix
  var projView = mat4.create();

  // Controller utility for interacting with the canvas and driving
  // the arcball camera
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

  // Not covered in the tutorial: track when the canvas is visible
  // on screen, and only render when it is visible.
  var canvasVisible = false;
  var observer = new IntersectionObserver(
    function (e) {
      if (e[0].isIntersecting) {
        canvasVisible = true;
      } else {
        canvasVisible = false;
      }
    },
    { threshold: [0] }
  );
  observer.observe(canvas);

  var animationFrame = function () {
    var resolve = null;
    var promise = new Promise((r) => (resolve = r));
    window.requestAnimationFrame(resolve);
    return promise;
  };

  requestAnimationFrame(animationFrame);

  while (true) {
    await animationFrame();

    if (canvasVisible) {
      renderPassDesc.colorAttachments[0].view = swapChain
        .getCurrentTexture()
        .createView();

      // Upload the combined projection and view matrix
      projView = mat4.mul(projView, projection, camera.camera);
      var upload = device.createBuffer({
        size: 20 * 4,
        usage: GPUBufferUsage.COPY_SRC,
        mappedAtCreation: true,
      });
      {
        var map = new Float32Array(upload.getMappedRange());
        map.set(projView);
        map.set(camera.eyePos(), 16);
      }
      upload.unmap();

      var commandEncoder = device.createCommandEncoder();

      // Copy the upload buffer to our uniform buffer
      commandEncoder.copyBufferToBuffer(upload, 0, viewParamsBuffer, 0, 20 * 4);

      var renderPass = commandEncoder.beginRenderPass(renderPassDesc);

      renderPass.setPipeline(renderPipeline);
      renderPass.setVertexBuffer(0, dataBuf);
      renderPass.setVertexBuffer(1, colorBuf);
      renderPass.setBindGroup(0, bindGroup);
      renderPass.draw(12 * 3, 1, 0, 0);

      renderPass.endPass();
      device.queue.submit([commandEncoder.finish()]);
    }
  }
})();
