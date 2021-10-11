var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { mat4 } from "gl-matrix";
import { ArcballCamera } from "arcball_camera";
import { Controller } from "ez_canvas_controller";
import TerrainGenerator from "./terrain_generator.js";
(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log("test");
    if (!navigator.gpu) {
        alert("WebGPU is not supported/enabled in your browser");
        return;
    }
    var nodeIDToValue = {};
    var nodeElements = [];
    var nodeData = [];
    var recomputeTerrain = false;
    function onSubmit(nodeElements, nodeData, nodeIDToValue, index) {
        const edgeReader = new FileReader();
        edgeReader.onload = function (event) {
            return __awaiter(this, void 0, void 0, function* () {
                var edgeData = edgeReader.result.split("\n");
                for (var element of edgeData) {
                    var parts = element.split("\t");
                    if (nodeIDToValue[parts[0]] && nodeIDToValue[parts[1]]) {
                        nodeElements.push({ data: { source: parts[0], target: parts[1], weight: parseFloat(parts[2]) } });
                    }
                }
                yield render(nodeData, index);
            });
        };
        const layoutReader = new FileReader();
        layoutReader.onload = function (event) {
            var layoutData = layoutReader.result.split("\n");
            var i = 0;
            for (var element of layoutData) {
                var parts = element.split("\t");
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
            for (var element of rawNodes) {
                nodeIDToValue[element.split("\t")[0]] = element.split("\t")[1];
            }
            layoutReader.readAsText(document.getElementById("layout").files[0]);
        };
        nodeReader.readAsText(document.getElementById("node").files[0]);
    }
    document.getElementById("submit").onclick = function () { onSubmit(nodeElements, nodeData[0], nodeIDToValue[0], 0); };
    // Get a context to display our rendered image on the canvas
    var canvas = document.getElementById("webgpu-canvas");
    console.log(window);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var context = canvas.getContext("webgpu");
    // Get a GPU device to render with
    var adapter = yield navigator.gpu.requestAdapter();
    var device = yield adapter.requestDevice();
    var terrainGenerator = new TerrainGenerator(device, 600, 600);
    //  var terrainSubtracter = new TerrainSubtracter(device, subtractCanvas);
    var vertModule3D = device.createShaderModule({ code: display_3d_vert });
    var fragModule3D = device.createShaderModule({ code: display_3d_frag });
    var vertModule2D = device.createShaderModule({ code: display_2d_vert });
    var fragModule2D = device.createShaderModule({ code: display_2d_frag });
    var storage = "storage";
    var uniform = "storage";
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
                    type: uniform,
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
                    type: storage
                }
            },
            {
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: storage,
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
                    type: storage
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
                    type: uniform
                }
            },
            {
                binding: 4,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: uniform
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
        1, -1, 0, 1,
        -1, -1, 0, 1,
        -1, 1, 0, 1,
        1, -1, 0, 1,
        -1, 1, 0, 1,
        1, 1, 0, 1, // position
    ]);
    dataBuf2D.unmap();
    // Create a buffer to store the view parameters
    var viewParamsBuffer = device.createBuffer({
        size: 20 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    // Create global range buffer
    var globalRangeBuffer = device.createBuffer({
        size: 2 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    var imageSizeBuffer = device.createBuffer({
        size: 2 * 4,
        usage: GPUBufferUsage.UNIFORM,
        mappedAtCreation: true
    });
    new Uint32Array(imageSizeBuffer.getMappedRange()).set([600, 600]);
    imageSizeBuffer.unmap();
    var uniform2DBuffer = [];
    var overlayCanvas = [];
    var overlayTexture = [];
    // Setup render outputs
    var swapChainFormat = "bgra8unorm";
    context.configure({
        device: device,
        format: swapChainFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    var depthFormat = "depth24plus-stencil8";
    var depthTexture = device.createTexture({
        size: {
            width: canvas.width,
            height: canvas.height,
            depthOrArrayLayers: 1,
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
    // var renderPipelineLine = device.createRenderPipeline({
    //   vertex: vertexLine,
    //   fragment: {
    //     module: fragModuleLine,
    //     entryPoint: "main",
    //     targets: [{
    //       format: swapChainFormat
    //     }]
    //   },
    //   primitive: {
    //     topology: 'line-list'
    //   }
    // });
    // const commandEncoder = device.createCommandEncoder();
    // const textureView = context[0].getCurrentTexture().createView();
    // const renderPass = commandEncoder.beginRenderPass({
    //   colorAttachments: [{
    //     view: textureView,
    //     loadValue: [0.5, 0.5, 0.8, 1], //background color
    //     storeOp: 'store'
    //   }]
    // });
    // renderPass.setPipeline(renderPipelineLine);
    // renderPass.draw(30);
    // renderPass.endPass();
    // device.queue.submit([commandEncoder.finish()]);
    // Load the default colormap and upload it
    var colormapImage = new Image();
    colormapImage.src = "colormaps/rainbow.png";
    yield colormapImage.decode();
    const imageBitmap = yield createImageBitmap(colormapImage);
    var colorTexture = device.createTexture({
        size: [imageBitmap.width, imageBitmap.height, 1],
        format: "rgba8unorm",
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    device.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: colorTexture }, [imageBitmap.width, imageBitmap.height, 1]);
    // Render!
    var renderPassDesc = {
        colorAttachments: [
            {
                view: undefined,
                loadValue: [0.3, 0.3, 0.3, 1],
                storeOp: "store",
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
    var projection = mat4.perspective(mat4.create(), (50 * Math.PI) / 180.0, canvas[0].width / canvas[0].height, 0.1, 100);
    // Matrix which will store the computed projection * view matrix
    var projView = mat4.create();
    // Controller utility for interacting with the canvas and driving the Arcball camera
    var controller = new Controller();
    controller.mousemove = function (prev, cur, evt) {
        if (evt.buttons == 1) {
            camera.rotate(prev, cur);
        }
        else if (evt.buttons == 2) {
            camera.pan([cur[0] - prev[0], prev[1] - cur[1]]);
        }
    };
    controller.wheel = function (amt) {
        camera.zoom(amt * 0.5);
    };
    controller.registerForCanvas(canvas[0]);
    function render(nodeData, index) {
        return __awaiter(this, void 0, void 0, function* () {
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
            if (document.getElementById("global").checked) {
                yield terrainGenerator[index].computeTerrain(nodeData, 1000, [0, 0, 1, 1], globalRangeBuffer);
            }
            else {
                yield terrainGenerator[index].computeTerrain(nodeData, 1000, [0, 0, 1, 1], null);
            }
            const rangeBuffer = device.createBuffer({
                size: 2 * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            var commandEncoder = device.createCommandEncoder();
            // Encode commands for copying buffer to buffer.
            commandEncoder.copyBufferToBuffer(terrainGenerator[index].rangeBuffer /* source buffer */, 0 /* source offset */, rangeBuffer /* destination buffer */, 0 /* destination offset */, 2 * 4 /* size */);
            // Submit GPU commands.
            device.queue.submit([commandEncoder.finish()]);
            // Read buffer.
            yield rangeBuffer.mapAsync(GPUMapMode.READ);
            console.log(new Int32Array(rangeBuffer.getMappedRange()));
            // Set up overlay
            uniform2DBuffer[index] = device.createBuffer({
                size: 3 * 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });
            var upload = device.createBuffer({
                size: 2 * 4,
                usage: GPUBufferUsage.COPY_SRC,
                mappedAtCreation: true,
            });
            var map = new Float32Array(upload.getMappedRange());
            map.set([this.peakValue, this.valleyValue]);
            upload.unmap();
            var commandEncoder = device.createCommandEncoder();
            commandEncoder.copyBufferToBuffer(upload, 0, uniform2DBuffer[index], 4, 2 * 4);
            device.queue.submit([commandEncoder.finish()]);
            overlayCanvas[index] = document.querySelectorAll("[data-id='layer2-node']")[index];
            overlayTexture[index] = device.createTexture({
                size: [overlayCanvas[index].width, overlayCanvas[index].height, 1],
                format: "rgba8unorm",
                usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
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
            //render!
            var frame = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    if (recomputeTerrain) {
                        if (document.getElementById("global").checked) {
                            yield terrainGenerator[index].computeTerrain(nodeData, 1000, [0, 0, 1, 1], globalRangeBuffer);
                        }
                        else {
                            yield terrainGenerator[index].computeTerrain(nodeData, 1000, [0, 0, 1, 1], null);
                        }
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
                        this.peakValue = document.getElementById("peak").value;
                        this.valleyValue = document.getElementById("valley").value;
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
                                        buffer: uniform2DBuffer[index],
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
                        var upload = device.createBuffer({
                            size: 2 * 4,
                            usage: GPUBufferUsage.COPY_SRC,
                            mappedAtCreation: true,
                        });
                        var map = new Float32Array(upload.getMappedRange());
                        map.set([this.peakValue, this.valleyValue]);
                        upload.unmap();
                        commandEncoder.copyBufferToBuffer(upload, 0, uniform2DBuffer[index], 4, 2 * 4);
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
                });
            };
            requestAnimationFrame(frame);
        });
    }
}))();
