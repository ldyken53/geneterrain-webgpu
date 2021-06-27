var TerrainGenerator = function (device, canvas) {
    this.device = device;
    this.canvas = canvas;

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
        ],
    });

    this.computeTerrainPipeline = device.createComputePipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [this.computeTerrainBGLayout],
        }),
        compute: {
            module: device.createShaderModule({
                code: compute_terrain_comp_spv,
            }),
            entryPoint: "main",
        },
    });

    // Create a buffer to store the params
    this.paramsBuffer = device.createBuffer({
        size: 4 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.pixelValueBuffer = device.createBuffer({
        size: this.canvas.width * this.canvas.height * 4,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
};

TerrainGenerator.prototype.computeTerrain =
    async function (nodeData, widthFactor) {
        // Set up node data buffer
        this.nodeDataBuffer = this.device.createBuffer({
            size: nodeData.length * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(this.nodeDataBuffer.getMappedRange()).set(nodeData);
        this.nodeDataBuffer.unmap();

        // Set up params (image width, height, node length, and width factor)
        var upload = this.device.createBuffer({
            size: 4 * 4,
            usage: GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true,
        });
        var mapping = upload.getMappedRange();
        new Uint32Array(mapping).set([this.canvas.width, this.canvas.height, nodeData.length / 4]);
        new Float32Array(mapping).set([widthFactor], 3);
        upload.unmap();
        var commandEncoder = this.device.createCommandEncoder();
        commandEncoder.copyBufferToBuffer(upload, 0, this.paramsBuffer, 0, 4 * 4);
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
            ],
        });

        // Run compute terrain pass
        var pass = commandEncoder.beginComputePass(this.computeTerrainPipeline);
        pass.setBindGroup(0, bindGroup);
        pass.setPipeline(this.computeTerrainPipeline);
        pass.dispatch(this.canvas.width, this.canvas.height, 1);
        pass.endPass();
        this.device.queue.submit([commandEncoder.finish()]);
        await this.device.queue.onSubmittedWorkDone();
    };