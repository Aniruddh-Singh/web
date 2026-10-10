import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { RequirePermission } from "../auth/decorators.js";
import { AuditService } from "./audit.service.js";

@ApiTags("admin: audit")
@ApiBearerAuth()
@Controller("admin/audit")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @RequirePermission("audit:view")
  @Get()
  list() {
    return this.audit.recent();
  }
}
