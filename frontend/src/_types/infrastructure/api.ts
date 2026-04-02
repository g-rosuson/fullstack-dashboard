export type ApiResponse<TData = undefined> = {
    success: boolean;
    data: TData;
    meta: ApiMetadata;
};

export type ApiMetadata = {
    timestamp: Date;
};
