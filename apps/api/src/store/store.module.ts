import { Module } from "@nestjs/common";
import { AdminStoreController } from "./admin-store.controller.js";
import { StoreController } from "./store.controller.js";
import { StoreService } from "./store.service.js";

@Module({ controllers: [StoreController, AdminStoreController], providers: [StoreService], exports: [StoreService] })
export class StoreModule {}
