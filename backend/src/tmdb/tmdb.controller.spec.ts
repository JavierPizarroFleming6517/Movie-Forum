import { TmdbController } from "./tmdb.controller";
import { TmdbService } from "./tmdb.service";
import { MOVIE, TV } from "./tmdb.client";

describe("TmdbController", () => {
  const tmdb = {
    buildMenu: jest.fn().mockResolvedValue({ secciones: [] }),
    getTrailer: jest.fn().mockResolvedValue({ clave: "x" }),
    getOrImport: jest.fn().mockResolvedValue({ id: 1 }),
    search: jest.fn().mockResolvedValue({ results: [] }),
    populares: jest.fn().mockResolvedValue({ results: [] }),
    listHome: jest.fn().mockResolvedValue({ rows: [] }),
    listGenres: jest.fn().mockResolvedValue({ results: [] }),
    listGenre: jest.fn().mockResolvedValue({ results: [] }),
    listCollection: jest.fn().mockResolvedValue({ results: [] }),
    listTvHome: jest.fn().mockResolvedValue({ rows: [] }),
  };
  const controller = new TmdbController(tmdb as unknown as TmdbService);

  it("exposes catalog routes", async () => {
    await controller.menu();
    await controller.trailer(11);
    await controller.getPelicula(11);
    await controller.buscar("dune");
    await controller.buscar(undefined as unknown as string);
    await controller.populares("2");
    await controller.populares("nope");
    await controller.inicio();
    await controller.generosPeliculas();
    await controller.generosSeries();
    await controller.genero(28, "3");
    await controller.genero(28, "x");
    await controller.coleccionPeliculas("populares", "2");
    await controller.seriesInicio();
    await controller.serieGenero(18, "1");
    await controller.coleccionSeries("populares", "1");
    await controller.serieTrailer(9);
    expect(tmdb.search).toHaveBeenCalledWith("");
    expect(tmdb.populares).toHaveBeenCalledWith(1);
    expect(tmdb.listGenre).toHaveBeenCalledWith(28, 1);
    expect(tmdb.listGenre).toHaveBeenCalledWith(18, 1, TV);
    expect(tmdb.listCollection).toHaveBeenCalledWith(MOVIE, "populares", 2);
    expect(tmdb.getTrailer).toHaveBeenCalledWith(9, TV);
  });
});
