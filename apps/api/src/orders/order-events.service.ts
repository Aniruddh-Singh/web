import { Injectable, type MessageEvent } from "@nestjs/common";
import type { OrderView } from "@coffeecat/shared";
import { filter, interval, map, merge, Observable, Subject } from "rxjs";

/**
 * In-process pub/sub for order changes, streamed to browsers as Server-Sent Events.
 * Single API instance for now; if it's ever scaled out, back this with Postgres LISTEN/NOTIFY.
 */
@Injectable()
export class OrderEventsService {
  private readonly changes = new Subject<OrderView>();

  publish(order: OrderView) {
    this.changes.next(order);
  }

  /** Every order change (staff board). */
  all(): Observable<MessageEvent> {
    return this.withHeartbeat(this.changes.pipe(map((order) => ({ type: "order", data: order }))));
  }

  /** One order's changes (customer tracking page). */
  forOrder(code: string): Observable<MessageEvent> {
    return this.withHeartbeat(
      this.changes.pipe(
        filter((o) => o.code === code),
        map((order) => ({ type: "order", data: order })),
      ),
    );
  }

  /** A comment every 25 s keeps proxies from closing idle connections. */
  private withHeartbeat(source: Observable<MessageEvent>) {
    return merge(source, interval(25_000).pipe(map(() => ({ type: "ping", data: "" }) as MessageEvent)));
  }
}
