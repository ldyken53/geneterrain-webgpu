var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var TerrainSubtracter = function (device, canvas) {
    this.device = device;
    this.canvas = canvas;
    var storage = "storage";
    var uniform = "uniform";
    this.subtractTerrainBGLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: uniform,
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: storage,
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: storage,
                }
            },
            {
                binding: 3,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: storage,
                }
            },
            {
                binding: 4,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: storage,
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
                    type: storage,
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: uniform,
                }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: storage,
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
        return __awaiter(this, void 0, void 0, function* () {
            // Have to reset range buffer
            this.rangeBuffer = this.device.createBuffer({
                size: 2 * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            });
            // Set up params (image width, height)
            var upload = this.device.createBuffer({
                size: 8 * 4,
                usage: GPUBufferUsage.COPY_SRC,
                mappedAtCreation: true,
            });
            var mapping = upload.getMappedRange();
            new Uint32Array(mapping).set([this.canvas.width, this.canvas.height]);
            new Float32Array(mapping).set([aFactor, bFactor], 2);
            upload.unmap();
            var commandEncoder = this.device.createCommandEncoder();
            commandEncoder.copyBufferToBuffer(upload, 0, this.paramsBuffer, 0, 8 * 4);
            // Create bind group
            var bindGroup = this.device.createBindGroup({
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
            // Run compute terrain pass
            var pass = commandEncoder.beginComputePass(this.subtractTerrainPipeline);
            pass.setBindGroup(0, bindGroup);
            pass.setPipeline(this.subtractTerrainPipeline);
            pass.dispatch(this.canvas.width, this.canvas.height, 1);
            pass.endPass();
            this.device.queue.submit([commandEncoder.finish()]);
            yield this.device.queue.onSubmittedWorkDone();
            const mseBuffer = this.device.createBuffer({
                size: this.canvas.width * this.canvas.height * 4,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
            });
            var commandEncoder = this.device.createCommandEncoder();
            // Encode commands for copying buffer to buffer.
            commandEncoder.copyBufferToBuffer(this.pixelValueBuffer /* source buffer */, 0 /* source offset */, mseBuffer /* destination buffer */, 0 /* destination offset */, this.canvas.width * this.canvas.height * 4 /* size */);
            // Submit GPU commands.
            this.device.queue.submit([commandEncoder.finish()]);
            // Read buffer.
            yield mseBuffer.mapAsync(GPUMapMode.READ);
            var mseArray = new Float32Array(mseBuffer.getMappedRange());
            var sum = 0;
            for (var x = 0; x < mseArray.length; x++) {
                sum += mseArray[x] * mseArray[x];
            }
            this.MSE = sum / (this.canvas.width * this.canvas.height);
            // Run normalize terrain pass
            var bindGroup = this.device.createBindGroup({
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
            var commandEncoder = this.device.createCommandEncoder();
            var pass = commandEncoder.beginComputePass(this.normalizeTerrainPipeline);
            pass.setBindGroup(0, bindGroup);
            pass.setPipeline(this.normalizeTerrainPipeline);
            pass.dispatch(this.canvas.width, this.canvas.height, 1);
            pass.endPass();
            this.device.queue.submit([commandEncoder.finish()]);
            yield this.device.queue.onSubmittedWorkDone();
        });
    };
export default TerrainSubtracter;
