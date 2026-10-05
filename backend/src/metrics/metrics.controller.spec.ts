import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";

describe("MetricsController", () => {
  it("forwards the requested range to the service", async () => {
    const service = { getMetrics: jest.fn().mockResolvedValue({ users: 3 }) };
    const controller = new MetricsController(service as unknown as MetricsService);

    await expect(controller.metrics({ days: 30 })).resolves.toEqual({ users: 3 });
    expect(service.getMetrics).toHaveBeenCalledWith({ days: 30 });
  });

  it("works without a range", async () => {
    const service = { getMetrics: jest.fn().mockResolvedValue({ users: 0 }) };
    const controller = new MetricsController(service as unknown as MetricsService);

    await controller.metrics({});
    expect(service.getMetrics).toHaveBeenCalledWith({ days: undefined });
  });
});