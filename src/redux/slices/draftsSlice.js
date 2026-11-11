import { createSlice } from "@reduxjs/toolkit";
import { removeDraftFromList, upsertDraftInList } from "../../utils/drafts";

const initialState = {
  userId: null,
  items: [],
  hydrated: false,
};

const draftsSlice = createSlice({
  name: "drafts",
  initialState,
  reducers: {
    // Load drafts for a user (from localStorage or another tab)
    hydrateDrafts: (state, action) => {
      const { userId = null, items = [] } = action.payload || {};
      state.userId = userId;
      state.items = Array.isArray(items) ? items : [];
      state.hydrated = true;
    },

    // Add a draft, or update the one with the same key
    upsertDraft: (state, action) => {
      state.items = upsertDraftInList(state.items, action.payload);
    },

    removeDraft: (state, action) => {
      state.items = removeDraftFromList(state.items, action.payload);
    },

    removeDraftByKey: (state, action) => {
      state.items = state.items.filter((item) => item.key !== action.payload);
    },

    // Logout: clear memory only, localStorage keeps the drafts
    clearDraftsMemory: (state) => {
      state.userId = null;
      state.items = [];
      state.hydrated = false;
    },
  },
});

export const { hydrateDrafts, upsertDraft, removeDraft, removeDraftByKey, clearDraftsMemory } =
  draftsSlice.actions;

export const selectDrafts = (state) => state.drafts.items;
export const selectDraftCount = (state) => state.drafts.items.length;
export const selectDraftById = (id) => (state) =>
  state.drafts.items.find((item) => item.id === id) || null;
export const selectDraftByKey = (key) => (state) =>
  state.drafts.items.find((item) => item.key === key) || null;

export default draftsSlice.reducer;
