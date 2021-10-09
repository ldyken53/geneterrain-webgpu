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
var TerrainGenerator = function (device, imageSize) {
    this.device = device;
    this.imageSize = imageSize;
    this.computeTerrainBGLayout = device.createBindGroupLayout({
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
            },
            {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage",
                }
            }
        ],
    });
    this.computeTerrainPipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [this.computeTerrainBGLayout],
        }),
        compute: {
            module: device.createShaderModule({
                code: compute_terrain,
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
    // Create a buffer to store the params, output, and min/max
    this.paramsBuffer = device.createBuffer({
        size: 8 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.pixelValueBuffer = device.createBuffer({
        size: this.imageSize[0] * this.imageSize[1] * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
};
TerrainGenerator.prototype.computeTerrain =
    function (nodeData, widthFactor, translation, globalRange) {
        return __awaiter(this, void 0, void 0, function () {
            var upload, mapping, commandEncoder, bindGroup, pass, bindGroup, commandEncoder, pass;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Set up node data buffer
                        this.nodeDataBuffer = this.device.createBuffer({
                            size: nodeData.length * 4,
                            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
                            mappedAtCreation: true,
                        });
                        new Float32Array(this.nodeDataBuffer.getMappedRange()).set(nodeData);
                        this.nodeDataBuffer.unmap();
                        // Have to reset range buffer unless global range checked
                        if (!globalRange) {
                            this.rangeBuffer = this.device.createBuffer({
                                size: 2 * 4,
                                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
                            });
                        }
                        else {
                            this.rangeBuffer = globalRange;
                        }
                        upload = this.device.createBuffer({
                            size: 8 * 4,
                            usage: GPUBufferUsage.COPY_SRC,
                            mappedAtCreation: true,
                        });
                        mapping = upload.getMappedRange();
                        new Uint32Array(mapping).set([this.imageSize[0], this.imageSize[1], nodeData.length / 4]);
                        new Float32Array(mapping).set([widthFactor, translation[0], translation[1], translation[2], translation[3]], 3);
                        upload.unmap();
                        this.device.createQuerySet({});
                        commandEncoder = this.device.createCommandEncoder();
                        commandEncoder.writeTimestamp();
                        commandEncoder.copyBufferToBuffer(upload, 0, this.paramsBuffer, 0, 8 * 4);
                        bindGroup = this.device.createBindGroup({
                            layout: this.computeTerrainBGLayout,
                            entries: [
                                {
                                    binding: 0,
                                    resource: {
                                        buffer: this.nodeDataBuffer,
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
                                        buffer: this.pixelValueBuffer,
                                    },
                                },
                                {
                                    binding: 3,
                                    resource: {
                                        buffer: this.rangeBuffer,
                                    },
                                },
                            ],
                        });
                        pass = commandEncoder.beginComputePass(this.computeTerrainPipeline);
                        pass.setBindGroup(0, bindGroup);
                        pass.setPipeline(this.computeTerrainPipeline);
                        pass.dispatch(this.imageSize[0], this.imageSize[1], 1);
                        pass.endPass();
                        commandEncoder.writeTimestamp();
                        this.device.queue.submit([commandEncoder.finish()]);
                        return [4 /*yield*/, this.device.queue.onSubmittedWorkDone()];
                    case 1:
                        _a.sent();
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
                        pass.dispatch(this.imageSize[0], this.imageSize[1], 1);
                        pass.endPass();
                        this.device.queue.submit([commandEncoder.finish()]);
                        return [4 /*yield*/, this.device.queue.onSubmittedWorkDone()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
