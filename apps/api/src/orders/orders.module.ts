import { Module } from "@nestjs/common";
import { PaymentsController } from "../payments/payments.controller.js";
import { RazorpayService } from "../payments/razorpay.service.js";
import { StoreModule } from "../store/store.module.js";
import { AdminOrdersController } from "./admin-orders.controller.js";
import { OrderEventsService } from "./order-events.service.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";

@Module({
  imports: [StoreModule],
  controllers: [OrdersController, AdminOrdersController, PaymentsController],
  providers: [OrdersService, OrderEventsService, RazorpayService],
  exports: [OrdersService, OrderEventsService, RazorpayService],
})
export class OrdersModule {}
