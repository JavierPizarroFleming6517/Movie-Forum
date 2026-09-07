import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { User } from "@prisma/client";

describe("CatalogController", () => {
  const catalog = {
    listCatalog: jest.fn().mockResolvedValue([]),
    listReviews: jest.fn().mockResolvedValue([]),
    upsertReview: jest.fn().mockResolvedValue({ id: 1 }),
  };
  const controller = new CatalogController(catalog as unknown as CatalogService);
  const user = { id: 1 } as User;

  it("defaults sort to comentadas", async () => {
    await controller.list(undefined);
    expect(catalog.listCatalog).toHaveBeenCalledWith("comentadas");
  });

  it("accepts valoradas", async () => {
    await controller.list("valoradas");
    expect(catalog.listCatalog).toHaveBeenCalledWith("valoradas");
  });

  it("lists reviews", async () => {
    await controller.reviews(111);
    expect(catalog.listReviews).toHaveBeenCalledWith(111);
  });

  it("upserts a review", async () => {
    const payload = { rating: 8, comment: "ok" };
    await expect(controller.upsert(111, payload, { user })).resolves.toEqual({ id: 1 });
    expect(catalog.upsertReview).toHaveBeenCalledWith(111, user, payload);
  });
});
