import { buildDraft, canRetryDraft } from "./drafts";
import { buildModalFormState, omitSecretFields } from "./modalDraft";

// Same shape as the Users / Client access modals in views/admin/users/index.jsx
const userModule = {
  requiresSecrets: true,
  apis: { signupUserApi: () => {}, updateUserApi: () => {} },
};
const clientModule = {
  requiresSecrets: true,
  apis: { createClientLoginApi: () => {}, updateClientLoginApi: () => {} },
};

const userForm = {
  name: "Jane",
  email: "jane@example.com",
  active: true,
  password: "s3cret-pass",
  confirm_password: "s3cret-pass",
  user_type: "user",
};
const clientForm = {
  client_ids: [4],
  primary_client_id: 4,
  email: "client@example.com",
  password: "s3cret-pass",
  confirm_password: "s3cret-pass",
  active: true,
};

const stored = (draft) => JSON.stringify(draft);

describe("user / client access drafts never hold passwords", () => {
  it("omitSecretFields drops every password key", () => {
    const out = omitSecretFields(userForm);
    expect(Object.keys(out)).toEqual(["name", "email", "active", "user_type"]);
    expect(omitSecretFields(null)).toEqual({});
  });

  it("user create: password stripped from requests, Retry disabled", () => {
    const payload = { name: "Jane", email: "jane@example.com", active: true, password: "s3cret-pass", user_type: "user" };
    const draft = buildDraft({
      module: "user",
      mode: "create",
      formState: buildModalFormState(omitSecretFields(userForm), null),
      requests: [{ api: "signupUserApi", args: [payload] }],
    });
    expect(stored(draft)).not.toContain("s3cret-pass");
    expect(stored({ f: draft.formState, r: draft.requests })).not.toContain("password");
    expect(draft.stripped.some((p) => p.endsWith("password"))).toBe(true);
    expect(canRetryDraft(draft, userModule)).toBe(false);
  });

  it("user create: sanitizer alone also drops raw form passwords", () => {
    const draft = buildDraft({
      module: "user",
      mode: "create",
      formState: buildModalFormState(userForm, null),
      requests: [],
    });
    expect(stored(draft)).not.toContain("s3cret-pass");
    expect(draft.formState.formData.password).toBeUndefined();
    expect(draft.formState.formData.confirm_password).toBeUndefined();
  });

  it("user update without a new password stays retryable", () => {
    const payload = { id: 9, name: "Jane", active: true, user_type: "user" };
    const draft = buildDraft({
      module: "user",
      mode: "update",
      recordId: 9,
      formState: buildModalFormState(omitSecretFields({ ...userForm, password: "", confirm_password: "" }), { id: 9 }),
      requests: [{ api: "updateUserApi", args: [payload] }],
    });
    expect(draft.stripped).toEqual([]);
    expect(draft.formState.editingId).toBe(9);
    expect(canRetryDraft(draft, userModule)).toBe(true);
  });

  it("user update with a new password is not retryable and stores no password", () => {
    const payload = { id: 9, name: "Jane", password: "s3cret-pass" };
    const draft = buildDraft({
      module: "user",
      mode: "update",
      recordId: 9,
      formState: buildModalFormState(omitSecretFields(userForm), { id: 9 }),
      requests: [{ api: "updateUserApi", args: [payload] }],
    });
    expect(stored(draft)).not.toContain("s3cret-pass");
    expect(canRetryDraft(draft, userModule)).toBe(false);
  });

  it("client access create: password and confirm_password stripped, Retry disabled", () => {
    const payload = {
      client_ids: [4],
      email: "client@example.com",
      password: "s3cret-pass",
      confirm_password: "s3cret-pass",
      primary_client_id: 4,
    };
    const draft = buildDraft({
      module: "clientLogin",
      mode: "create",
      formState: buildModalFormState(omitSecretFields(clientForm), null),
      requests: [{ api: "createClientLoginApi", args: [payload] }],
    });
    expect(stored(draft)).not.toContain("s3cret-pass");
    expect(stored({ f: draft.formState, r: draft.requests })).not.toContain("password");
    expect(draft.stripped.some((p) => p.endsWith("confirm_password"))).toBe(true);
    expect(canRetryDraft(draft, clientModule)).toBe(false);
  });

  it("client access update without password stays retryable", () => {
    const payload = { id: 3, email: "client@example.com", active: true, client_ids: [4], primary_client_id: 4 };
    const draft = buildDraft({
      module: "clientLogin",
      mode: "update",
      recordId: 3,
      formState: buildModalFormState(omitSecretFields(clientForm), { id: 3 }),
      requests: [{ api: "updateClientLoginApi", args: [payload] }],
    });
    expect(canRetryDraft(draft, clientModule)).toBe(true);
  });
});
