import { Controller, Get, Header } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { menuResponse } from "@coffeecat/shared";
import { z } from "zod";
import { Public } from "../auth/decorators.js";
import { MenuService } from "./menu.service.js";

@ApiTags("menu")
@Public()
@Controller("menu")
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get()
  @Header("Cache-Control", "public, max-age=30, stale-while-revalidate=300")
  @ApiOkResponse({ description: "The full public menu", schema: z.toJSONSchema(menuResponse) as object })
  getMenu() {
    return this.menu.getMenu();
  }
}
