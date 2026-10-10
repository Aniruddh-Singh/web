import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators.js";
import { StoreService } from "./store.service.js";

@ApiTags("store")
@Public()
@Controller("store")
export class StoreController {
  constructor(private readonly store: StoreService) {}

  @Get()
  get() {
    return this.store.getPublic();
  }
}
