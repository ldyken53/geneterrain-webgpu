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

    this.rangeBuffer = this.device.createBuffer({
        size: 2 * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
};

TerrainGenerator.prototype.computeTerrain =
    async function (nodeData, widthFactor, translation, globalRange) {
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

        // Set up params (image width, height, node length, and width factor)
        var upload = this.device.createBuffer({
            size: 8 * 4,
            usage: GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true,
        });
        var mapping = upload.getMappedRange();
        new Uint32Array(mapping).set([this.imageSize[0], this.imageSize[1], nodeData.length / 4]);
        new Float32Array(mapping).set([widthFactor, translation[0], translation[1], translation[2], translation[3]], 3);
        upload.unmap();
        var commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(upload, 0, this.paramsBuffer, 0, 8 * 4);
        // Create bind group
        var bindGroup = this.device.createBindGroup({
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

        // Run compute terrain pass
        var pass = commandEncoder.beginComputePass(this.computeTerrainPipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setPipeline(this.computeTerrainPipeline);
        pass.dispatch(this.imageSize[0], this.imageSize[1], 1);
        pass.endPass();
        this.device.queue.submit([commandEncoder.finish()]);
        await this.device.queue.onSubmittedWorkDone();

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
        pass.dispatch(this.imageSize[0], this.imageSize[1], 1);
        pass.endPass();
        this.device.queue.submit([commandEncoder.finish()]);
        await this.device.queue.onSubmittedWorkDone();
    };