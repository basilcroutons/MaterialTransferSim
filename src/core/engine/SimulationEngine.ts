import { TransferPipeline } from '../../models/TransferPipeline';

export class SimulationEngine {
    private pipelines: Map<string, TransferPipeline> = new Map();
    private isRunning: boolean = false;
    private tickRateMs: number = 1000;
    private timerId: any = null;

    constructor(tickRateMs: number = 1000) {
        this.tickRateMs = tickRateMs;
    }

    public addPipeline(pipeline: TransferPipeline): void {
        this.pipelines.set(pipeline.id, pipeline);
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.timerId = setInterval(() => this.tick(), this.tickRateMs);
        console.log("Simulation Engine Started.");
    }

    public stop(): void {
        if (!this.isRunning) return;
        this.isRunning = false;
        if (this.timerId) clearInterval(this.timerId);
        console.log("Simulation Engine Stopped.");
    }

    private tick(): void {
        // Core simulation loop tick logic
        this.pipelines.forEach((pipeline) => {
            if (pipeline.activeMaterial) {
                // Perform material transfer step calculation
            }
        });
    }
}
