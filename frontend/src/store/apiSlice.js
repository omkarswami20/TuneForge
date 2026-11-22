import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const tuneForgeApi = createApi({
  reducerPath: 'tuneForgeApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['State', 'Folder'],
  endpoints: (builder) => ({
    // Real-time Queue State via REST + WebSocket streaming
    getState: builder.query({
      query: () => 'api/state',
      providesTags: ['State'],
      async onCacheEntryAdded(
        _arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        let ws;
        try {
          await cacheDataLoaded;

          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          const host = window.location.port === '5173' ? '127.0.0.1:8000' : window.location.host;
          const wsUrl = `${protocol}//${host}/ws`;

          ws = new WebSocket(wsUrl);

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data && typeof data === 'object') {
                updateCachedData((draft) => {
                  Object.assign(draft, data);
                });
              }
            } catch (err) {
              console.warn('[TuneForge WS] Parse error:', err);
            }
          };

          ws.onerror = (err) => {
            console.warn('[TuneForge WS] Socket error:', err);
          };
        } catch (err) {
          console.warn('[TuneForge WS] Initialization error:', err);
        }

        await cacheEntryRemoved;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      },
    }),

    // Local destination folder information
    getFolderInfo: builder.query({
      query: () => 'api/folder',
      providesTags: ['Folder'],
    }),

    // Extract metadata & songs from URL
    extractUrl: builder.mutation({
      query: (url) => ({
        url: 'api/extract',
        method: 'POST',
        body: { url: (url ?? '').trim() },
      }),
      invalidatesTags: ['State'],
    }),

    // Start one-by-one sequential download queue
    startQueue: builder.mutation({
      query: () => ({
        url: 'api/start',
        method: 'POST',
      }),
      invalidatesTags: ['State'],
    }),

    // Stop active download queue
    stopQueue: builder.mutation({
      query: () => ({
        url: 'api/stop',
        method: 'POST',
      }),
      invalidatesTags: ['State'],
    }),

    // Open local Downloads/TuneForge folder in Windows Explorer
    openFolder: builder.mutation({
      query: () => ({
        url: 'api/open-folder',
        method: 'POST',
      }),
      invalidatesTags: ['Folder'],
    }),
  }),
});

export const {
  useGetStateQuery,
  useGetFolderInfoQuery,
  useExtractUrlMutation,
  useStartQueueMutation,
  useStopQueueMutation,
  useOpenFolderMutation,
} = tuneForgeApi;
