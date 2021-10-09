var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _this = this;
(function () { return __awaiter(_this, void 0, void 0, function () {
    function onSubmit(nodeElements, nodeData, nodeIDToValue, index) {
        var edgeReader = new FileReader();
        edgeReader.onload = function (event) {
            return __awaiter(this, void 0, void 0, function () {
                var _i, edgeData_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            edgeData = edgeReader.result.split("\n");
                            for (_i = 0, edgeData_1 = edgeData; _i < edgeData_1.length; _i++) {
                                element = edgeData_1[_i];
                                parts = element.split("\t");
                                if (nodeIDToValue[parts[0]] && nodeIDToValue[parts[1]]) {
                                    nodeElements.push({ data: { source: parts[0], target: parts[1], weight: parseFloat(parts[2]) } });
                                }
                            }
                            drawCytoscape(index);
                            return [4 /*yield*/, render(nodeData, index)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        var layoutReader = new FileReader();
        layoutReader.onload = function (event) {
            layoutData = layoutReader.result.split("\n");
            var i = 0;
            for (var _i = 0, layoutData_1 = layoutData; _i < layoutData_1.length; _i++) {
                element = layoutData_1[_i];
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
        var nodeReader = new FileReader();
        nodeReader.onload = function (event) {
            var rawNodes = nodeReader.result.split("\n");
            for (var _i = 0, rawNodes_1 = rawNodes; _i < rawNodes_1.length; _i++) {
                element = rawNodes_1[_i];
                nodeIDToValue[element.split("\t")[0]] = element.split("\t")[1];
            }
            layoutReader.readAsText(document.getElementById("layout").files[0]);
        };
        nodeReader.readAsText(document.getElementById("node").files[0]);
    }
    function onSave(index) {
        var index;
        return __awaiter(this, void 0, void 0, function () {
            var height, width, gpuReadBuffer, commandEncoder, gpuCommands, arrayBuffer, output, outCanvas, context, colorData, imgData, i, j, colorIndex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        height = canvas[index].height;
                        width = canvas[index].width;
                        gpuReadBuffer = device.createBuffer({
                            size: width * height * 4,
                            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                        });
                        commandEncoder = device.createCommandEncoder();
                        // Encode commands for copying buffer to buffer.
                        commandEncoder.copyBufferToBuffer(terrainGenerator[index].pixelValueBuffer /* source buffer */, 0 /* source offset */, gpuReadBuffer /* destination buffer */, 0 /* destination offset */, width * height * 4 /* size */);
                        gpuCommands = commandEncoder.finish();
                        device.queue.submit([gpuCommands]);
                        // Read buffer.
                        return [4 /*yield*/, gpuReadBuffer.mapAsync(GPUMapMode.READ)];
                    case 1:
                        // Read buffer.
                        _a.sent();
                        arrayBuffer = gpuReadBuffer.getMappedRange();
                        output = new Float32Array(arrayBuffer);
                        outCanvas = document.getElementById('out-canvas');
                        context = outCanvas.getContext('2d');
                        context.drawImage(colormapImage, 0, 0);
                        colorData = context.getImageData(0, 0, 180, 1).data;
                        imgData = context.createImageData(width, height);
                        for (i = 0; i < height; i++) {
                            for (j = 0; j < width; j++) {
                                index = j + i * width;
                                colorIndex = Math.trunc(output[j + (height - 1 - i) * width] * 180) * 4;
                                imgData.data[index * 4] = colorData[colorIndex];
                                imgData.data[index * 4 + 1] = colorData[colorIndex + 1];
                                imgData.data[index * 4 + 2] = colorData[colorIndex + 2];
                                imgData.data[index * 4 + 3] = colorData[colorIndex + 3];
                            }
                        }
                        context.putImageData(imgData, 0, 0);
                        outCanvas.toBlob(function (b) { saveAs(b, "terrain.png"); }, "image/png");
                        return [2 /*return*/];
                }
            });
        });
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
                        'background-color': "data(color)",
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
                }]);
        }
    }
    function drawCytoscape(index) {
        cy[index] = cytoscape({
            minZoom: 1e-1,
            maxZoom: 1e1,
            wheelSensitivity: 0.1,
            container: document.getElementById("cy" + (index == 1 ? "2" : "")),
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
        cy[index].nodes().on('dragfreeon', function (event) { reloadNodeData(event, nodeData[index]); });
        edgeElements[index] = cy[index].edges().remove();
    }
    function reloadViewBox(event, index) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
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
                return [2 /*return*/];
            });
        });
    }
    function reloadNodeData(event, nodeData) {
        return __awaiter(this, void 0, void 0, function () {
            var x, y;
            return __generator(this, function (_a) {
                x = event.target._private.position.x / 1200;
                y = event.target._private.position.y / -1200;
                console.log(nodeData[event.target._private.data.index * 4], x, y);
                nodeData[event.target._private.data.index * 4 + 1] = x;
                nodeData[event.target._private.data.index * 4 + 2] = y;
                recomputeTerrain[index] = true;
                return [2 /*return*/];
            });
        });
    }
    function render(nodeData, index) {
        return __awaiter(this, void 0, void 0, function () {
            var rangeBuffer, commandEncoder, upload, map, commandEncoder, frame;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        nodeDataOriginal[index] = __spreadArray([], nodeData, true);
                        if (!document.getElementById("global").checked) return [3 /*break*/, 2];
                        return [4 /*yield*/, terrainGenerator[index].computeTerrain(nodeData, widthFactor[index], translation[index], globalRangeBuffer)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, terrainGenerator[index].computeTerrain(nodeData, widthFactor[index], translation[index])];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        rangeBuffer = device.createBuffer({
                            size: 2 * 4,
                            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                        });
                        commandEncoder = device.createCommandEncoder();
                        // Encode commands for copying buffer to buffer.
                        commandEncoder.copyBufferToBuffer(terrainGenerator[index].rangeBuffer /* source buffer */, 0 /* source offset */, rangeBuffer /* destination buffer */, 0 /* destination offset */, 2 * 4 /* size */);
                        // Submit GPU commands.
                        device.queue.submit([commandEncoder.finish()]);
                        // Read buffer.
                        return [4 /*yield*/, rangeBuffer.mapAsync(GPUMapMode.READ)];
                    case 5:
                        // Read buffer.
                        _a.sent();
                        console.log(new Int32Array(rangeBuffer.getMappedRange()));
                        // Set up overlay
                        uniform2DBuffer[index] = device.createBuffer({
                            size: 3 * 4,
                            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                        });
                        upload = device.createBuffer({
                            size: 2 * 4,
                            usage: GPUBufferUsage.COPY_SRC,
                            mappedAtCreation: true,
                        });
                        map = new Float32Array(upload.getMappedRange());
                        map.set([this.peakValue, this.valleyValue]);
                        upload.unmap();
                        commandEncoder = device.createCommandEncoder();
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
                        cy[index].reset();
                        cy[index].zoom(0.5);
                        cy[index].panBy({ x: 0, y: 600 });
                        cy[index].on('pan', function (event) { reloadViewBox(event, index); });
                        frame = function () {
                            return __awaiter(this, void 0, void 0, function () {
                                var overlayImage, imageBitmap_1, bindGroup, upload, map, commandEncoder, renderPass, bindGroup, commandEncoder, upload, map, renderPass;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            reloadCytoscapeStyle(index);
                                            if (!document.getElementById("overlay" + (index > 0 ? "2" : "")).checked) return [3 /*break*/, 3];
                                            overlayImage = new Image();
                                            overlayImage.src = overlayCanvas[index].toDataURL();
                                            return [4 /*yield*/, overlayImage.decode()];
                                        case 1:
                                            _a.sent();
                                            return [4 /*yield*/, createImageBitmap(overlayImage)];
                                        case 2:
                                            imageBitmap_1 = _a.sent();
                                            device.queue.copyExternalImageToTexture({ source: imageBitmap_1 }, { texture: overlayTexture[index] }, [imageBitmap_1.width, imageBitmap_1.height, 1]);
                                            _a.label = 3;
                                        case 3:
                                            if (!recomputeTerrain[index]) return [3 /*break*/, 8];
                                            start = performance.now();
                                            if (!document.getElementById("global").checked) return [3 /*break*/, 5];
                                            return [4 /*yield*/, terrainGenerator[index].computeTerrain(nodeData, widthFactor[index], translation[index], globalRangeBuffer)];
                                        case 4:
                                            _a.sent();
                                            return [3 /*break*/, 7];
                                        case 5: return [4 /*yield*/, terrainGenerator[index].computeTerrain(nodeData, widthFactor[index], translation[index])];
                                        case 6:
                                            _a.sent();
                                            _a.label = 7;
                                        case 7:
                                            console.log(performance.now() - start);
                                            recomputeSubtract = true;
                                            recomputeTerrain[index] = false;
                                            _a.label = 8;
                                        case 8:
                                            if (document.getElementById("3d").checked) {
                                                bindGroup = device.createBindGroup({
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
                                                upload = device.createBuffer({
                                                    size: 20 * 4,
                                                    usage: GPUBufferUsage.COPY_SRC,
                                                    mappedAtCreation: true,
                                                });
                                                map = new Float32Array(upload.getMappedRange());
                                                map.set(projView);
                                                map.set(camera.eyePos(), 16);
                                                upload.unmap();
                                                commandEncoder = device.createCommandEncoder();
                                                // Copy the upload buffer to our uniform buffer
                                                commandEncoder.copyBufferToBuffer(upload, 0, viewParamsBuffer, 0, 20 * 4);
                                                renderPass = commandEncoder.beginRenderPass(renderPassDesc);
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
                                                bindGroup = device.createBindGroup({
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
                                                commandEncoder = device.createCommandEncoder();
                                                upload = device.createBuffer({
                                                    size: 2 * 4,
                                                    usage: GPUBufferUsage.COPY_SRC,
                                                    mappedAtCreation: true,
                                                });
                                                map = new Float32Array(upload.getMappedRange());
                                                map.set([this.peakValue, this.valleyValue]);
                                                upload.unmap();
                                                commandEncoder.copyBufferToBuffer(upload, 0, uniform2DBuffer[index], 4, 2 * 4);
                                                renderPass = commandEncoder.beginRenderPass(renderPassDesc);
                                                renderPass.setPipeline(renderPipeline2D);
                                                renderPass.setVertexBuffer(0, dataBuf2D);
                                                // Set the bind group to its associated slot
                                                renderPass.setBindGroup(0, bindGroup);
                                                renderPass.draw(6, 1, 0, 0);
                                                renderPass.endPass();
                                                device.queue.submit([commandEncoder.finish()]);
                                                requestAnimationFrame(frame);
                                            }
                                            return [2 /*return*/];
                                    }
                                });
                            });
                        };
                        requestAnimationFrame(frame);
                        return [2 /*return*/];
                }
            });
        });
    }
    var canvas, context, adapter, device, terrainGenerator, subtractCanvas, terrainSubtracter, subtractContext, vertModule3D, fragModule3D, vertModule2D, fragModule2D, vertModuleLine, fragModuleLine, vertex3D, vertex2D, vertexLine, displayTerrain3DBGLayout, displayTerrain2DBGLayout, dataBuf3D, dataBuf2D, viewParamsBuffer, globalRangeBuffer, imageSizeBuffer, uniform2DBuffer, overlayCanvas, overlayTexture, swapChainFormat, depthFormat, depthTexture, layout3D, layout2D, renderPipeline3D, renderPipeline2D, colormapImage, imageBitmap, colorTexture, renderPassDesc, camera, projection, projView, controller, cy, subtractFrame;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!navigator.gpu) {
                    alert("WebGPU is not supported/enabled in your browser");
                    return [2 /*return*/];
                }
                this.nodeIDToValue = [{}, {}];
                this.nodeData = [[], []];
                this.nodeDataOriginal = [[], []];
                this.nodeElements = [[], []];
                this.edgeElements = [[], []];
                this.layoutData = null;
                this.widthFactor = [document.getElementById("width").value, document.getElementById("width2").value];
                this.peakValue = document.getElementById("peak").value;
                this.valleyValue = document.getElementById("valley").value;
                this.recomputeTerrain = [false, false];
                this.recomputeSubtract = false;
                this.translation = [[0, 0, 1, 1], [0, 0, 1, 1]];
                this.fontSize = [24, 24];
                this.nodeHeight = [16, 16];
                this.nodeWidth = [16, 16];
                document.getElementById("submit").onclick = function () { onSubmit(nodeElements[0], nodeData[0], nodeIDToValue[0], 0); };
                document.getElementById("submit2").onclick = function () { onSubmit(nodeElements[1], nodeData[1], nodeIDToValue[1], 1); };
                document.getElementById("save").onclick = function () { onSave(0); };
                document.getElementById("save2").onclick = function () { onSave(1); };
                canvas = [document.getElementById("webgpu-canvas"), document.getElementById("webgpu-canvas-2")];
                context = [canvas[0].getContext("webgpu"), canvas[1].getContext("webgpu")];
                document.getElementById("overlay").onclick = function () {
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
                    commandEncoder.copyBufferToBuffer(upload, 0, uniform2DBuffer[0], 0, 4);
                    device.queue.submit([commandEncoder.finish()]);
                };
                document.getElementById("overlay2").onclick = function () {
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
                    commandEncoder.copyBufferToBuffer(upload, 0, uniform2DBuffer[1], 0, 4);
                    device.queue.submit([commandEncoder.finish()]);
                };
                document.getElementById("hideSelected").onclick = function () {
                    if (document.getElementById("hideSelected").checked) {
                        for (var _i = 0, _a = cy[0].nodes(':selected'); _i < _a.length; _i++) {
                            node = _a[_i];
                            nodeData[0][node._private.data.index * 4] = 0;
                            node._private.data.opacity = 0;
                        }
                    }
                    else {
                        for (var _b = 0, _c = cy[0].nodes(':selected'); _b < _c.length; _b++) {
                            node = _c[_b];
                            nodeData[0][node._private.data.index * 4] = nodeDataOriginal[0][node._private.data.index * 4];
                            node._private.data.opacity = 1;
                        }
                    }
                    recomputeTerrain[0] = true;
                };
                document.getElementById("hideSelected2").onclick = function () {
                    if (document.getElementById("hideSelected2").checked) {
                        for (var _i = 0, _a = cy[1].nodes(':selected'); _i < _a.length; _i++) {
                            node = _a[_i];
                            nodeData[1][node._private.data.index * 4] = 0;
                            node._private.data.opacity = 0;
                        }
                    }
                    else {
                        for (var _b = 0, _c = cy[1].nodes(':selected'); _b < _c.length; _b++) {
                            node = _c[_b];
                            nodeData[1][node._private.data.index * 4] = nodeDataOriginal[1][node._private.data.index * 4];
                            node._private.data.opacity = 1;
                        }
                    }
                    recomputeTerrain[1] = true;
                };
                document.getElementById("showSelected").onclick = function () {
                    if (document.getElementById("showSelected").checked) {
                        for (var i = 0; i < nodeData[0].length; i += 4) {
                            nodeData[0][i] = 0;
                        }
                        for (var _i = 0, _a = cy[0].nodes(); _i < _a.length; _i++) {
                            node = _a[_i];
                            node._private.data.opacity = 0;
                        }
                        for (var _b = 0, _c = cy[0].nodes(':selected'); _b < _c.length; _b++) {
                            node = _c[_b];
                            nodeData[0][node._private.data.index * 4] = nodeDataOriginal[0][node._private.data.index * 4];
                            node._private.data.opacity = 1;
                        }
                    }
                    else {
                        for (var i = 0; i < nodeData[0].length; i += 4) {
                            nodeData[0][i] = nodeDataOriginal[0][i];
                        }
                        for (var _d = 0, _e = cy[0].nodes(); _d < _e.length; _d++) {
                            node = _e[_d];
                            node._private.data.opacity = 1;
                        }
                    }
                    recomputeTerrain[0] = true;
                };
                document.getElementById("showSelected2").onclick = function () {
                    if (document.getElementById("showSelected2").checked) {
                        for (var i = 0; i < nodeData[1].length; i += 4) {
                            nodeData[1][i] = 0;
                        }
                        for (var _i = 0, _a = cy[1].nodes(); _i < _a.length; _i++) {
                            node = _a[_i];
                            node._private.data.opacity = 0;
                        }
                        for (var _b = 0, _c = cy[1].nodes(':selected'); _b < _c.length; _b++) {
                            node = _c[_b];
                            nodeData[1][node._private.data.index * 4] = nodeDataOriginal[1][node._private.data.index * 4];
                            node._private.data.opacity = 1;
                        }
                    }
                    else {
                        for (var i = 0; i < nodeData[1].length; i += 4) {
                            nodeData[1][i] = nodeDataOriginal[1][i];
                        }
                        for (var _d = 0, _e = cy[1].nodes(); _d < _e.length; _d++) {
                            node = _e[_d];
                            node._private.data.opacity = 1;
                        }
                    }
                    recomputeTerrain[1] = true;
                };
                document.getElementById("width").oninput = function () {
                    var width = document.getElementById("width").value;
                    // if (width > 10) {
                    //   width = width - 9;
                    // } else {
                    //   width = width / 10;
                    // }
                    widthFactor[0] = width;
                    recomputeTerrain[0] = true;
                };
                document.getElementById("width2").oninput = function () {
                    var width = document.getElementById("width2").value;
                    // if (width > 10) {
                    //   width = width - 9;
                    // } else {
                    //   width = width / 10;
                    // }
                    widthFactor[1] = width;
                    recomputeTerrain[1] = true;
                };
                document.getElementById("edges").onclick = function () {
                    if (document.getElementById("edges").checked) {
                        edgeElements[0].restore();
                    }
                    else {
                        edgeElements[0] = edgeElements[0].remove();
                    }
                    reloadCytoscapeStyle(0);
                };
                document.getElementById("edges2").onclick = function () {
                    if (document.getElementById("edges2").checked) {
                        edgeElements[1].restore();
                    }
                    else {
                        edgeElements[1] = edgeElements[1].remove();
                    }
                    reloadCytoscapeStyle(1);
                };
                return [4 /*yield*/, navigator.gpu.requestAdapter()];
            case 1:
                adapter = _a.sent();
                return [4 /*yield*/, adapter.requestDevice()];
            case 2:
                device = _a.sent();
                terrainGenerator = [new TerrainGenerator(device, [600, 600]), new TerrainGenerator(device, [600, 600])];
                subtractCanvas = document.getElementById("subtract-canvas");
                terrainSubtracter = new TerrainSubtracter(device, subtractCanvas);
                subtractContext = subtractCanvas.getContext("webgpu");
                vertModule3D = device.createShaderModule({ code: display_3d_vert });
                fragModule3D = device.createShaderModule({ code: display_3d_frag });
                vertModule2D = device.createShaderModule({ code: display_2d_vert });
                fragModule2D = device.createShaderModule({ code: display_2d_frag });
                vertModuleLine = device.createShaderModule({ code: draw_lines_vert });
                fragModuleLine = device.createShaderModule({ code: draw_lines_frag });
                vertex3D = {
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
                vertex2D = {
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
                vertexLine = {
                    module: vertModuleLine,
                    entryPoint: "main"
                };
                displayTerrain3DBGLayout = device.createBindGroupLayout({
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
                displayTerrain2DBGLayout = device.createBindGroupLayout({
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
                dataBuf3D = device.createBuffer({
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
                dataBuf2D = device.createBuffer({
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
                viewParamsBuffer = device.createBuffer({
                    size: 20 * 4,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
                });
                globalRangeBuffer = device.createBuffer({
                    size: 2 * 4,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
                });
                imageSizeBuffer = device.createBuffer({
                    size: 2 * 4,
                    usage: GPUBufferUsage.UNIFORM,
                    mappedAtCreation: true
                });
                new Uint32Array(imageSizeBuffer.getMappedRange()).set([600, 600]);
                imageSizeBuffer.unmap();
                uniform2DBuffer = [];
                overlayCanvas = [];
                overlayTexture = [];
                swapChainFormat = "bgra8unorm";
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
                depthFormat = "depth24plus-stencil8";
                depthTexture = device.createTexture({
                    size: {
                        width: canvas[0].width,
                        height: canvas[0].height,
                        depth: 1,
                    },
                    format: depthFormat,
                    usage: GPUTextureUsage.RENDER_ATTACHMENT,
                });
                layout3D = device.createPipelineLayout({
                    bindGroupLayouts: [displayTerrain3DBGLayout],
                });
                layout2D = device.createPipelineLayout({
                    bindGroupLayouts: [displayTerrain2DBGLayout],
                });
                renderPipeline3D = device.createRenderPipeline({
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
                renderPipeline2D = device.createRenderPipeline({
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
                colormapImage = new Image();
                colormapImage.src = "colormaps/rainbow.png";
                return [4 /*yield*/, colormapImage.decode()];
            case 3:
                _a.sent();
                return [4 /*yield*/, createImageBitmap(colormapImage)];
            case 4:
                imageBitmap = _a.sent();
                colorTexture = device.createTexture({
                    size: [imageBitmap.width, imageBitmap.height, 1],
                    format: "rgba8unorm",
                    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
                });
                device.queue.copyExternalImageToTexture({ source: imageBitmap }, { texture: colorTexture }, [imageBitmap.width, imageBitmap.height, 1]);
                renderPassDesc = {
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
                camera = new ArcballCamera([0, 0, 3], [0, 0, 0], [0, 1, 0], 0.5, [
                    canvas[0].width,
                    canvas[0].height,
                ]);
                projection = mat4.perspective(mat4.create(), (50 * Math.PI) / 180.0, canvas[0].width / canvas[0].height, 0.1, 100);
                projView = mat4.create();
                controller = new Controller();
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
                cy = [null, null];
                document.getElementById("aFactor").oninput = function () {
                    recomputeSubtract = true;
                };
                document.getElementById("bFactor").oninput = function () {
                    recomputeSubtract = true;
                };
                document.getElementById("subtract").onclick = function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var aFactor, bFactor, maxDiff, absMaxDiff, indices, id, _i, _a, diff, absMin, absMindex, diffString, i;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    aFactor = parseFloat(document.getElementById("aFactor").value);
                                    bFactor = parseFloat(document.getElementById("bFactor").value);
                                    return [4 /*yield*/, terrainSubtracter.subtractTerrain(terrainGenerator[0].pixelValueBuffer, terrainGenerator[1].pixelValueBuffer, aFactor, bFactor)];
                                case 1:
                                    _b.sent();
                                    recomputeSubtract = false;
                                    document.getElementById("compare-label").innerText = "Mean Squared Error: " + terrainSubtracter.MSE;
                                    maxDiff = [0, 0, 0, 0, 0];
                                    absMaxDiff = [0, 0, 0, 0, 0];
                                    indices = [0, 0, 0, 0, 0];
                                    id = ["", "", "", "", ""];
                                    for (_i = 0, _a = nodeElements[0]; _i < _a.length; _i++) {
                                        element = _a[_i];
                                        diff = nodeIDToValue[0][element.data.id] - nodeIDToValue[1][element.data.id];
                                        absMin = Math.min.apply(Math, absMaxDiff);
                                        if (Math.abs(diff) > absMin) {
                                            absMindex = absMaxDiff.indexOf(absMin);
                                            indices[absMindex] = element.data.index;
                                            id[absMindex] = element.data.id;
                                            absMaxDiff[absMindex] = Math.abs(diff);
                                            maxDiff[absMindex] = diff;
                                        }
                                    }
                                    diffString = "Max Gene Differences\n";
                                    for (i = 0; i < 5; i++) {
                                        nodeElements[0][indices[i]].data.color = "red";
                                        nodeElements[1][indices[i]].data.color = "red";
                                        diffString += id[i] + ": " + maxDiff[i] + "\n";
                                    }
                                    document.getElementById("node-difference").value = diffString;
                                    requestAnimationFrame(subtractFrame);
                                    return [2 /*return*/];
                            }
                        });
                    });
                };
                subtractFrame = function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var aFactor, bFactor, bindGroup, upload, map, commandEncoder, renderPass, bindGroup, commandEncoder, renderPass;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!recomputeSubtract) return [3 /*break*/, 2];
                                    aFactor = parseFloat(document.getElementById("aFactor").value);
                                    bFactor = parseFloat(document.getElementById("bFactor").value);
                                    start = performance.now();
                                    return [4 /*yield*/, terrainSubtracter.subtractTerrain(terrainGenerator[0].pixelValueBuffer, terrainGenerator[1].pixelValueBuffer, aFactor, bFactor)];
                                case 1:
                                    _a.sent();
                                    console.log(performance.now() - start);
                                    document.getElementById("compare-label").innerText = "Mean Squared Error: " + terrainSubtracter.MSE;
                                    recomputeSubtract = false;
                                    _a.label = 2;
                                case 2:
                                    if (document.getElementById("3d").checked) {
                                        bindGroup = device.createBindGroup({
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
                                        upload = device.createBuffer({
                                            size: 20 * 4,
                                            usage: GPUBufferUsage.COPY_SRC,
                                            mappedAtCreation: true,
                                        });
                                        map = new Float32Array(upload.getMappedRange());
                                        map.set(projView);
                                        map.set(camera.eyePos(), 16);
                                        upload.unmap();
                                        commandEncoder = device.createCommandEncoder();
                                        // Copy the upload buffer to our uniform buffer
                                        commandEncoder.copyBufferToBuffer(upload, 0, viewParamsBuffer, 0, 20 * 4);
                                        renderPass = commandEncoder.beginRenderPass(renderPassDesc);
                                        renderPass.setPipeline(renderPipeline3D);
                                        renderPass.setVertexBuffer(0, dataBuf3D);
                                        // Set the bind group to its associated slot
                                        renderPass.setBindGroup(0, bindGroup);
                                        renderPass.draw(12 * 3, 1, 0, 0);
                                        renderPass.endPass();
                                        device.queue.submit([commandEncoder.finish()]);
                                    }
                                    else {
                                        bindGroup = device.createBindGroup({
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
                                                        buffer: uniform2DBuffer[0],
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
                                        commandEncoder = device.createCommandEncoder();
                                        renderPass = commandEncoder.beginRenderPass(renderPassDesc);
                                        renderPass.setPipeline(renderPipeline2D);
                                        renderPass.setVertexBuffer(0, dataBuf2D);
                                        // Set the bind group to its associated slot
                                        renderPass.setBindGroup(0, bindGroup);
                                        renderPass.draw(6, 1, 0, 0);
                                        renderPass.endPass();
                                        device.queue.submit([commandEncoder.finish()]);
                                    }
                                    requestAnimationFrame(subtractFrame);
                                    return [2 /*return*/];
                            }
                        });
                    });
                };
                return [2 /*return*/];
        }
    });
}); })();
