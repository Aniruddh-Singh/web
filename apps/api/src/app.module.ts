import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminMenuModule } from "./admin-menu/admin-menu.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CouponsModule } from "./coupons/coupons.module.js";
import { CustomersModule } from "./customers/customers.module.js";
import { RevalidateModule } from "./revalidate/revalidate.module.js";
import { StaffModule } from "./staff/staff.module.js";
import { UploadsModule } from "./uploads/uploads.controller.js";
import { DbModule } from "./db/db.module.js";
import { HealthController } from "./health/health.controller.js";
import { MenuModule } from "./menu/menu.module.js";
import { OrdersModule } from "./orders/orders.module.js";
import { StoreModule } from "./store/store.module.js";

@Module({
  imports: [
    // 120 requests a minute per IP by default; stricter limits go on order and login endpoints.
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 120 }], skipIf: () => process.env.NODE_ENV === "test" }),
    DbModule,
    AuthModule,
    AuditModule,
    RevalidateModule,
    OrdersModule,
    AdminMenuModule,
    UploadsModule,
    CouponsModule,
    StaffModule,
    CustomersModule,
    MenuModule,
    StoreModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
