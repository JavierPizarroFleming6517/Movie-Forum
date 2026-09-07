import { PrismaService } from "./prisma.service";

describe("PrismaService", () => {
  it("disconnects on module destroy", async () => {
    const service = new PrismaService();
    const disconnect = jest.spyOn(service, "$disconnect").mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(disconnect).toHaveBeenCalled();
    disconnect.mockRestore();
  });
});
