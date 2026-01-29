import { models } from "../models";
import { Types } from "mongoose";

export class POSService {

  /**
   * Retrieves all dispatches (shipments) destined for a specific branch.
   * Flattens the result so the UI gets a list of shipments, not orders.
   */
  async getIncomingDispatches(branch: string) {
    if (!branch) {
      throw new Error("Branch parameter is required");
    }

    // Aggregation to unwind dispatches and filter by destination
    const pipeline = [
      { $match: { "dispatches.destination": branch } },
      { $unwind: "$dispatches" },
      { $match: { "dispatches.destination": branch } },
      {
        $project: {
          _id: 0, // We want the dispatch _id to be the main ID if possible, or keep structure
          orderId: "$_id",
          orderNumber: "$orderNumber", // Assuming there is one, or just use ID
          customerName: "$customerName",
          deliveryDate: "$deliveryDate",
          dispatch: "$dispatches", // The unwound dispatch object
          // Include other order info useful for context
          products: "$products"
        }
      },
      { $sort: { "dispatch.reportedAt": -1 } } // Newest shipments first
    ];

    const shipments = await models.orders.aggregate(pipeline as any);
    return shipments;
  }

  /**
   * Register reception of a specific dispatch.
   */
  async registerReception(orderId: string, dispatchId: string, receptionData: {
    receivedBy: string,
    receptionNotes?: string,
    items: { productId: string, quantityReceived: number, itemStatus: string }[]
  }) {

    if (!Types.ObjectId.isValid(orderId) || !Types.ObjectId.isValid(dispatchId)) {
      throw new Error("Invalid ID format");
    }

    const order = await models.orders.findById(orderId);
    if (!order) throw new Error("Order not found");

    const dispatch = order.dispatches.find((d: any) => d._id.toString() === dispatchId);
    if (!dispatch) throw new Error("Dispatch not found");

    if (dispatch.receptionStatus === "RECEIVED") {
      // Optional: Allow updating if needed? For now, let's allow it but warn or just process.
      // User might want to correct a mistake.
    }

    // Update Dispatch Header
    dispatch.receivedAt = new Date();
    dispatch.receivedBy = receptionData.receivedBy;
    dispatch.receptionNotes = receptionData.receptionNotes;

    // Update Items
    let hasIssues = false;

    if (receptionData.items && Array.isArray(receptionData.items)) {
      receptionData.items.forEach(receivedItem => {
        const itemInDispatch = dispatch.items.find((item: any) =>
          item.productId.toString() === receivedItem.productId
        );

        if (itemInDispatch) {
          // Update the received quantity and status
          itemInDispatch.quantityReceived = receivedItem.quantityReceived;
          itemInDispatch.itemStatus = receivedItem.itemStatus as "OK" | "MISSING" | "DAMAGED";

          // Check for discrepancies
          if (
            itemInDispatch.itemStatus !== 'OK' ||
            itemInDispatch.quantityReceived !== itemInDispatch.quantitySent
          ) {
            hasIssues = true;
          }
        }
      });
    }

    // Set Final Reception Status
    dispatch.receptionStatus = hasIssues ? "PROBLEM" : "RECEIVED";
    dispatch.modifiedAt = new Date();

    // Check if other dispatches are pending to update overall Order Dispatch Status?
    // Not strictly required by current prompt, but good practice.
    // For now, just save.

    await order.save();
    return dispatch;
  }

  /**
   * Get pickup orders for a specific branch.
   * Filters by deliveryType: 'retiro' and branch.
   * Returns active/future orders (e.g. not delivered/completed if status existed, but we'll list all for now or sort by date).
   */
  async getPickupOrders(branch: string) {
    if (!branch) {
      throw new Error("Branch parameter is required");
    }

    // Find orders that are for pickup at this branch
    // We can filter by date if needed (e.g. deliveryDate >= today - 1 day)
    // For now, let's just get the recent ones (limit 50 or sort desc)
    const orders = await models.orders.find({
      deliveryType: "retiro",
      branch: branch
    })
      .sort({ deliveryDate: 1 }) // Soonest first
      .select("orderNumber customerName deliveryDate deliveryTime products productionStatus totalValue paymentMethod paymentDetails")
      .limit(100);

    return orders;
  }
}
