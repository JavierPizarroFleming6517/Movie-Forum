import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { User } from "@prisma/client";

describe("CatalogController", () => {
  const catalog = {
    listCatalog: jest.fn().mockResolvedValue([]),
    listReviews: jest.fn().mockResolvedValue([]),
    listRecentReviews: jest.fn().mockResolvedValue([]),
    upsertReview: jest.fn().mockResolvedValue({ id: 1 }),
    deleteReview: jest.fn().mockResolvedValue(undefined),
    addReply: jest.fn().mockResolvedValue({ id: 2 }),
    updateReply: jest.fn().mockResolvedValue({ id: 2 }),
    deleteReply: jest.fn().mockResolvedValue(undefined),
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

  it("lists recent reviews", async () => {
    await controller.recientes();
    expect(catalog.listRecentReviews).toHaveBeenCalled();
  });

  it("lists reviews", async () => {
    await controller.reviews(111);
    expect(catalog.listReviews).toHaveBeenCalledWith(111, undefined);
  });

  it("upserts a review", async () => {
    const payload = { rating: 8, comment: "ok" };
    await expect(controller.upsert(111, payload, { user })).resolves.toEqual({ id: 1 });
    expect(catalog.upsertReview).toHaveBeenCalledWith(111, user, payload, undefined);
  });

  it("deletes the current user's review", async () => {
    await controller.remove(111, { user }, "serie");
    expect(catalog.deleteReview).toHaveBeenCalledWith(111, user, "serie");
  });

  it("adds a reply to a thread", async () => {
    await controller.addReply(4, { comment: "ok" }, { user });
    expect(catalog.addReply).toHaveBeenCalledWith(4, user, { comment: "ok" });
  });

  it("updates a reply", async () => {
    await controller.updateReply(2, { comment: "edit" }, { user });
    expect(catalog.updateReply).toHaveBeenCalledWith(2, user, { comment: "edit" });
  });

  it("deletes a reply", async () => {
    await controller.deleteReply(2, { user });
    expect(catalog.deleteReply).toHaveBeenCalledWith(2, user);
  });
});
