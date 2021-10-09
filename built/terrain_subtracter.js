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
var TerrainSubtracter = function (device, canvas) {
    this.device = device;
    this.canvas = canvas;
    this.subtractTerrainBGLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "uniform",
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            {
                binding: 4,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ],
    });
    this.subtractTerrainPipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [this.subtractTerrainBGLayout],
        }),
        compute: {
            module: device.createShaderModule({
                code: subtract_terrain,
            }),
            entryPoint: "main",
        },
    });
    this.normalizeTerrainBGLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "uniform",
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ],
    });
    this.normalizeTerrainPipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [this.normalizeTerrainBGLayout],
        }),
        compute: {
            module: device.createShaderModule({
                code: normalize_terrain,
            }),
            entryPoint: "main",
        },
    });
    // Create a buffer to store the params
    this.paramsBuffer = device.createBuffer({
        size: 8 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.pixelValueBuffer = device.createBuffer({
        size: this.canvas.width * this.canvas.height * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
};
TerrainSubtracter.prototype.subtractTerrain =
    function (pixelsA, pixelsB, aFactor, bFactor) {
        return __awaiter(this, void 0, void 0, function () {
            var upload, mapping, commandEncoder, bindGroup, pass, mseBuffer, commandEncoder, mseArray, sum, x, bindGroup, commandEncoder, pass;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Have to reset range buffer
                        this.rangeBuffer = this.device.createBuffer({
                            size: 2 * 4,
                            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
                        });
                        upload = this.device.createBuffer({
                            size: 8 * 4,
                            usage: GPUBufferUsage.COPY_SRC,
                            mappedAtCreation: true,
                        });
                        mapping = upload.getMappedRange();
                        new Uint32Array(mapping).set([this.canvas.width, this.canvas.height]);
                        new Float32Array(mapping).set([aFactor, bFactor], 2);
                        upload.unmap();
                        commandEncoder = this.device.createCommandEncoder();
                        commandEncoder.copyBufferToBuffer(upload, 0, this.paramsBuffer, 0, 8 * 4);
                        bindGroup = this.device.createBindGroup({
                            layout: this.subtractTerrainBGLayout,
                            entries: [
                                {
                                    binding: 0,
                                    resource: {
                                        buffer: this.paramsBuffer,
                                    },
                                },
                                {
                                    binding: 1,
                                    resource: {
                                        buffer: pixelsA,
                                    },
                                },
                                {
                                    binding: 2,
                                    resource: {
                                        buffer: pixelsB,
                                    },
                                },
                                {
                                    binding: 3,
                                    resource: {
                                        buffer: this.pixelValueBuffer,
                                    },
                                },
                                {
                                    binding: 4,
                                    resource: {
                                        buffer: this.rangeBuffer,
                                    },
                                }
                            ],
                        });
                        pass = commandEncoder.beginComputePass(this.subtractTerrainPipeline);
                        pass.setBindGroup(0, bindGroup);
                        pass.setPipeline(this.subtractTerrainPipeline);
                        pass.dispatch(this.canvas.width, this.canvas.height, 1);
                        pass.endPass();
                        this.device.queue.submit([commandEncoder.finish()]);
                        return [4 /*yield*/, this.device.queue.onSubmittedWorkDone()];
                    case 1:
                        _a.sent();
                        mseBuffer = this.device.createBuffer({
                            size: this.canvas.width * this.canvas.height * 4,
                            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
                        });
                        commandEncoder = this.device.createCommandEncoder();
                        // Encode commands for copying buffer to buffer.
                        commandEncoder.copyBufferToBuffer(this.pixelValueBuffer /* source buffer */, 0 /* source offset */, mseBuffer /* destination buffer */, 0 /* destination offset */, this.canvas.width * this.canvas.height * 4 /* size */);
                        // Submit GPU commands.
                        this.device.queue.submit([commandEncoder.finish()]);
                        // Read buffer.
                        return [4 /*yield*/, mseBuffer.mapAsync(GPUMapMode.READ)];
                    case 2:
                        // Read buffer.
                        _a.sent();
                        mseArray = new Float32Array(mseBuffer.getMappedRange());
                        sum = 0;
                        for (x = 0; x < mseArray.length; x++) {
                            sum += mseArray[x] * mseArray[x];
                        }
                        this.MSE = sum / (this.canvas.width * this.canvas.height);
                        bindGroup = this.device.createBindGroup({
                            layout: this.normalizeTerrainBGLayout,
                            entries: [
                                {
                                    binding: 0,
                                    resource: {
                                        buffer: this.pixelValueBuffer,
                                    },
                                },
                                {
                                    binding: 1,
                                    resource: {
                                        buffer: this.paramsBuffer,
                                    },
                                },
                                {
                                    binding: 2,
                                    resource: {
                                        buffer: this.rangeBuffer,
                                    },
                                },
                            ],
                        });
                        commandEncoder = this.device.createCommandEncoder();
                        pass = commandEncoder.beginComputePass(this.normalizeTerrainPipeline);
                        pass.setBindGroup(0, bindGroup);
                        pass.setPipeline(this.normalizeTerrainPipeline);
                        pass.dispatch(this.canvas.width, this.canvas.height, 1);
                        pass.endPass();
                        this.device.queue.submit([commandEncoder.finish()]);
                        return [4 /*yield*/, this.device.queue.onSubmittedWorkDone()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
