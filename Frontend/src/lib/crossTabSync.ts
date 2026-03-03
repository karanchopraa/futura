/**
 * Cross-tab synchronization using BroadcastChannel API.
 * When a Buy or Sell action completes in one tab, other tabs
 * are notified so they can refresh their data immediately.
 */

const CHANNEL_NAME = "futura_trades";

export interface TradeEvent {
    type: "TRADE_COMPLETED";
    timestamp: number;
}

/**
 * Broadcast a trade event to all other open tabs.
 */
export function broadcastTradeEvent(): void {
    if (typeof BroadcastChannel === "undefined") return;
    try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage({ type: "TRADE_COMPLETED", timestamp: Date.now() } as TradeEvent);
        channel.close();
    } catch (_) {
        // BroadcastChannel not supported or blocked — silently ignore
    }
}

/**
 * Listen for trade events from other tabs.
 * Returns a cleanup function to stop listening.
 */
export function onTradeEvent(callback: (event: TradeEvent) => void): () => void {
    if (typeof BroadcastChannel === "undefined") return () => { };
    try {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        const handler = (event: MessageEvent<TradeEvent>) => {
            if (event.data?.type === "TRADE_COMPLETED") {
                callback(event.data);
            }
        };
        channel.addEventListener("message", handler);
        return () => {
            channel.removeEventListener("message", handler);
            channel.close();
        };
    } catch (_) {
        return () => { };
    }
}
