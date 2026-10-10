import { Module } from "@nestjs/common";
import { MenuModule } from "../menu/menu.module.js";
import { AdminMenuController } from "./admin-menu.controller.js";
import { AdminMenuService } from "./admin-menu.service.js";

@Module({ imports: [MenuModule], controllers: [AdminMenuController], providers: [AdminMenuService] })
export class AdminMenuModule {}
