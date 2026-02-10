import { Schema, model, Document, Types } from "mongoose";

export interface IOrderProduct {
  _id?: Types.ObjectId;
  name: string;
  quantity: number;
  price: number;
  contifico_id?: string;
  produced?: number; // Track how many items have been produced
  productionStatus?: "PENDING" | "IN_PROCESS" | "COMPLETED";
  productionNotes?: string;
  isCourtesy?: boolean;
}

export interface IDispatchItem {
  productId: string; // The _id of the product in the products array
  name: string;      // Snapshot of name for UI ease
  quantitySent: number;
  quantityReceived?: number;
  itemStatus?: "OK" | "MISSING" | "DAMAGED";
}

export interface IDispatch {
  _id: Types.ObjectId;
  reportedAt: Date;
  modifiedAt: Date;
  destination: string; // e.g. "San Marino", "Delivery @ Address"
  items: IDispatchItem[];
  notes?: string;
  reportedBy: string; // e.g. "Production User"

  // Reception Fields
  receptionStatus: "PENDING" | "RECEIVED" | "PROBLEM";
  receivedAt?: Date;
  receivedBy?: string;
  receptionNotes?: string;
}

export interface IOrder extends Document {
  // ... existing fields ...
  deliveryPerson?: {
    name: string;
    identification: string;
    personId?: Types.ObjectId;
  };
  orderDate: Date;
  deliveryDate: Date;
  deliveryTime?: string;
  customerName: string;
  customerPhone: string;
  salesChannel: string;
  products: IOrderProduct[];
  deliveryType: "delivery" | "retiro";
  branch?: "San Marino" | "Mall del Sol" | "Centro de Producción";
  googleMapsLink?: string;
  deliveryAddress?: string;
  totalValue: number;
  deliveryValue: number;
  paymentMethod: string;
  invoiceNeeded: boolean;
  responsible: "Hillary" | "E" | "Ivin" | "Web";
  comments?: string;
  invoiceData?: {
    ruc: string;
    businessName: string;
    email: string;
    address: string;
  };
  invoiceStatus?: "PENDING" | "PROCESSED" | "ERROR";
  invoiceInfo?: any;
  productionStage: "PENDING" | "IN_PROCESS" | "FINISHED" | "DELAYED" | "VOID";
  productionNotes: string;
  voidedAt: Date | null;
  settledInIsland: boolean;
  settledIslandName?: string;

  // Dispatch Fields
  dispatches: IDispatch[];
  dispatchStatus: "NOT_SENT" | "PARTIAL" | "SENT" | "PROBLEM" | "RETURNED";

  paymentDetails?: {
    forma_cobro: string;
    monto: number;
    fecha: string;
    numero_comprobante?: string;
    cuenta_bancaria_id?: string;
    tipo_ping?: string;
    numero_tarjeta?: string;
  };
  payments: Array<{
    forma_cobro: string;
    monto: number;
    fecha: Date;
    numero_comprobante?: string;
    cuenta_bancaria_id?: string;
    tipo_ping?: string;
    numero_tarjeta?: string;
    reference?: string;
    status?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DispatchSchema = new Schema<IDispatch>({
  reportedAt: { type: Date, default: Date.now },
  modifiedAt: { type: Date, default: Date.now },
  destination: { type: String, required: true },
  items: [
    {
      productId: { type: String, required: true },
      name: { type: String },
      quantitySent: { type: Number, required: true },
      quantityReceived: { type: Number },
      itemStatus: { type: String, enum: ["OK", "MISSING", "DAMAGED"], default: "OK" }
    }
  ],
  notes: { type: String },
  reportedBy: { type: String, default: "Producción" },

  // Reception Fields
  receptionStatus: {
    type: String,
    enum: ["PENDING", "RECEIVED", "PROBLEM"],
    default: "PENDING"
  },
  receivedAt: { type: Date },
  receivedBy: { type: String },
  receptionNotes: { type: String }
});

const OrderSchema = new Schema<IOrder>(
  {
    deliveryPerson: {
      name: { type: String },
      identification: { type: String },
      personId: { type: Schema.Types.ObjectId, ref: "DeliveryPerson" }
    },
    orderDate: { type: Date, required: true },
    deliveryDate: { type: Date, required: true },
    deliveryTime: { type: String, required: false },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    salesChannel: { type: String, required: true },
    products: [
      {
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        contifico_id: { type: String },
        produced: { type: Number, default: 0 },
        productionStatus: {
          type: String,
          enum: ["PENDING", "IN_PROCESS", "COMPLETED"],
          default: "PENDING"
        },
        productionNotes: { type: String },
        isCourtesy: { type: Boolean, default: false }
      },
    ],
    deliveryType: {
      type: String,
      enum: ["delivery", "retiro"],
      required: true,
    },
    branch: {
      type: String,
      enum: ["San Marino", "Mall del Sol", "Centro de Producción"],
      required: false
    },
    googleMapsLink: { type: String },
    deliveryAddress: { type: String },
    totalValue: { type: Number, required: true },
    deliveryValue: { type: Number, default: 0 },
    paymentMethod: { type: String, required: true },
    invoiceNeeded: { type: Boolean, default: false },
    invoiceStatus: {
      type: String,
      enum: ["PENDING", "PROCESSED", "ERROR"],
      default: function () {
        return this.invoiceNeeded ? "PENDING" : undefined;
      }
    },
    responsible: {
      type: String,
      enum: ["Hillary", "E", "Ivin", "Web"],
      required: true,
    },
    comments: { type: String },
    invoiceData: {
      ruc: { type: String },
      businessName: { type: String },
      email: { type: String },
      address: { type: String },
    },
    invoiceInfo: { type: Schema.Types.Mixed },

    // Production Fields
    productionStage: {
      type: String,
      enum: ["PENDING", "IN_PROCESS", "FINISHED", "DELAYED", "VOID"],
      default: "PENDING"
    },
    productionNotes: { type: String, default: "" },
    voidedAt: { type: Date, default: null },
    settledInIsland: { type: Boolean, default: false },
    settledIslandName: { type: String },

    // Dispatch Fields
    dispatches: { type: [DispatchSchema], default: [] },
    dispatchStatus: {
      type: String,
      enum: ["NOT_SENT", "PARTIAL", "SENT", "PROBLEM", "RETURNED"],
      default: "NOT_SENT"
    },

    paymentDetails: {
      forma_cobro: String,
      monto: Number,
      fecha: String,
      numero_comprobante: String,
      cuenta_bancaria_id: String,
      tipo_ping: String,
      numero_tarjeta: String
    },
    payments: [
      {
        forma_cobro: { type: String, required: true },
        monto: { type: Number, required: true },
        fecha: { type: Date, default: Date.now },
        numero_comprobante: String,
        cuenta_bancaria_id: String,
        tipo_ping: String,
        numero_tarjeta: String,
        reference: String, // Contifico or external reference
        status: { type: String, enum: ['PENDING', 'PAID', 'ERROR'], default: 'PAID' }
      }
    ]
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const OrderModel = model<IOrder>("Order", OrderSchema);
