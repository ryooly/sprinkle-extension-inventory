declare module "midtrans-client" {
  export interface MidtransClientConfig {
    isProduction?: boolean;
    serverKey?: string;
    clientKey?: string;
  }

  export interface SnapTransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  export interface SnapCustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }

  export interface SnapItemDetail {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }

  export interface SnapTransactionParameter {
    transaction_details: SnapTransactionDetails;
    customer_details?: SnapCustomerDetails;
    item_details?: SnapItemDetail[];
    [key: string]: unknown;
  }

  export interface SnapTransactionResult {
    token: string;
    redirect_url: string;
    [key: string]: unknown;
  }

  export interface RefundParameters {
    refund_key?: string;
    amount?: number;
    reason?: string;
    [key: string]: unknown;
  }

  export interface MidtransResponse {
    status_code?: string;
    status_message?: string;
    transaction_id?: string;
    order_id?: string;
    [key: string]: unknown;
  }

  export interface CoreApiTransaction {
    refund(
      transactionId: string,
      params?: RefundParameters,
    ): Promise<MidtransResponse>;
  }

  export class Snap {
    constructor(config?: MidtransClientConfig);
    createTransaction(
      parameter: SnapTransactionParameter,
    ): Promise<SnapTransactionResult>;
  }

  export class CoreApi {
    constructor(config?: MidtransClientConfig);
    transaction: CoreApiTransaction;
  }

  const midtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };

  export default midtransClient;
}
