import i18n from "../i18n";

const TOKEN_KEY = "lapabg_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * data.detail от FastAPI бывает либо строкой (большинство наших HTTPException),
 * либо массивом объектов Pydantic-валидации (автоматические 422-ошибки,
 * например "поле длиннее 200 символов"). Без этой функции массив просто
 * кидался как есть — JS превращал его в "[object Object]" при выводе пользователю.
 */
function extractErrorDetail(data, fallback) {
  const detail = data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail.map((e) => (typeof e === "string" ? e : e.msg)).filter(Boolean);
    return messages.length ? messages.join("; ") : fallback;
  }
  return fallback;
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json", "X-Lang": i18n.language };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = i18n.t("api_error.default");
    try {
      const data = await res.json();
      detail = extractErrorDetail(data, detail);
    } catch {
      // no-op
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

async function uploadImage(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}`, "X-Lang": i18n.language } : { "X-Lang": i18n.language },
    body: formData,
  });

  if (!res.ok) {
    let detail = i18n.t("api_error.photo_upload_failed");
    try {
      const data = await res.json();
      detail = extractErrorDetail(data, detail);
    } catch {
      // no-op
    }
    throw new Error(detail);
  }

  return res.json();
}

export const api = {
  requestRegisterCode: (data) => request("/auth/register/request-code", { method: "POST", body: data }),
  verifyRegisterCode: (data) => request("/auth/register/verify-code", { method: "POST", body: data }),
  forgotPassword: (data) => request("/auth/password/forgot", { method: "POST", body: data }),
  resetPassword: (data) => request("/auth/password/reset", { method: "POST", body: data }),
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  telegramAuth: (data) => request("/auth/telegram", { method: "POST", body: data }),
  me: () => request("/auth/me", { auth: true }),
  completeOnboarding: () => request("/auth/onboarding-complete", { method: "PATCH", auth: true }),
  requestPasswordChangeCode: (data) => request("/auth/password/request-code", { method: "POST", body: data, auth: true }),
  changePassword: (data) => request("/auth/password", { method: "PATCH", body: data, auth: true }),
  deleteAccount: (password) => request("/auth/me", { method: "DELETE", body: { password }, auth: true }),

  user: (id) => request(`/users/${id}`),
  users: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/users${qs ? `?${qs}` : ""}`);
  },

  posts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/posts${qs ? `?${qs}` : ""}`, { auth: true });
  },
  localPulse: () => request("/posts/local-pulse"),
  createPost: (data) => request("/posts", { method: "POST", body: data, auth: true }),
  post: (id) => request(`/posts/${id}`, { auth: true }),
  resolvePost: (id) => request(`/posts/${id}/resolve`, { method: "PATCH", auth: true }),
  updatePost: (id, data) => request(`/posts/${id}`, { method: "PATCH", body: data, auth: true }),
  deletePost: (id) => request(`/posts/${id}`, { method: "DELETE", auth: true }),
  savePost: (id) => request(`/posts/${id}/save`, { method: "POST", auth: true }),
  unsavePost: (id) => request(`/posts/${id}/save`, { method: "DELETE", auth: true }),
  reactToPost: (id, emoji) => request(`/posts/${id}/reaction`, { method: "PUT", auth: true, body: { emoji } }),
  removeReaction: (id) => request(`/posts/${id}/reaction`, { method: "DELETE", auth: true }),
  savedPosts: () => request("/posts/saved", { auth: true }),
  reportPost: (id, reason) => request(`/posts/${id}/report`, { method: "POST", body: { reason }, auth: true }),
  comments: (id) => request(`/posts/${id}/comments`),
  addComment: (id, body) => request(`/posts/${id}/comments`, { method: "POST", body, auth: true }),

  myPets: () => request("/pets/mine", { auth: true }),
  petsOfUser: (userId) => request(`/pets/user/${userId}`),
  pets: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/pets${qs ? `?${qs}` : ""}`);
  },
  pet: (id) => request(`/pets/${id}`),
  createPet: (data) => request("/pets", { method: "POST", body: data, auth: true }),
  deletePet: (id) => request(`/pets/${id}`, { method: "DELETE", auth: true }),

  services: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/services${qs ? `?${qs}` : ""}`);
  },
  becomeProvider: (data) => request("/services", { method: "POST", body: data, auth: true }),
  providerReviews: (id) => request(`/services/${id}/reviews`),
  reviewProvider: (id, data) => request(`/services/${id}/reviews`, { method: "POST", body: data, auth: true }),

  follow: (userId) => request(`/follows/${userId}`, { method: "POST", auth: true }),
  unfollow: (userId) => request(`/follows/${userId}`, { method: "DELETE", auth: true }),
  blockedUsers: () => request("/blocks", { auth: true }),
  blockUser: (userId) => request(`/blocks/${userId}`, { method: "POST", auth: true }),
  unblockUser: (userId) => request(`/blocks/${userId}`, { method: "DELETE", auth: true }),
  followers: (userId) => request(`/follows/${userId}/followers`),
  following: (userId) => request(`/follows/${userId}/following`),

  notifications: () => request("/notifications", { auth: true }),
  unreadNotificationsCount: () => request("/notifications/unread-count", { auth: true }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "PATCH", auth: true }),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH", auth: true }),

  adminOverview: () => request("/admin/overview", { auth: true }),
  adminReports: (resolved, limit, offset) => {
    const params = new URLSearchParams();
    if (resolved !== undefined) params.set("resolved", resolved);
    if (limit !== undefined) params.set("limit", limit);
    if (offset !== undefined) params.set("offset", offset);
    const qs = params.toString();
    return request(`/admin/reports${qs ? `?${qs}` : ""}`, { auth: true });
  },
  adminDismissReport: (id) => request(`/admin/reports/${id}/dismiss`, { method: "PATCH", auth: true }),
  adminDeletePost: (id) => request(`/admin/posts/${id}`, { method: "DELETE", auth: true }),
  adminDeleteListing: (id) => request(`/admin/listings/${id}`, { method: "DELETE", auth: true }),
  adminAuditLog: (limit, offset) => {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set("limit", limit);
    if (offset !== undefined) params.set("offset", offset);
    const qs = params.toString();
    return request(`/admin/audit-log${qs ? `?${qs}` : ""}`, { auth: true });
  },
  adminServiceProviders: () => request("/admin/service-providers", { auth: true }),
  adminUsers: (q, limit, offset) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (limit !== undefined) params.set("limit", limit);
    if (offset !== undefined) params.set("offset", offset);
    const qs = params.toString();
    return request(`/admin/users${qs ? `?${qs}` : ""}`, { auth: true });
  },
  adminSetUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: "PATCH", body: { role }, auth: true }),
  adminDeleteCommunity: (id) => request(`/admin/communities/${id}`, { method: "DELETE", auth: true }),
  adminToggleVerifyProvider: (id) => request(`/admin/service-providers/${id}/verify`, { method: "PATCH", auth: true }),

  communities: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/communities${qs ? `?${qs}` : ""}`, { auth: true });
  },
  community: (id) => request(`/communities/${id}`, { auth: true }),
  createCommunity: (data) => request("/communities", { method: "POST", body: data, auth: true }),
  updateCommunity: (id, data) => request(`/communities/${id}`, { method: "PATCH", body: data, auth: true }),
  joinCommunity: (id) => request(`/communities/${id}/join`, { method: "POST", auth: true }),
  leaveCommunity: (id) => request(`/communities/${id}/leave`, { method: "DELETE", auth: true }),
  communityMembers: (id) => request(`/communities/${id}/members`),

  conversations: () => request("/messages/conversations", { auth: true }),
  messageThread: (userId) => request(`/messages/${userId}`, { auth: true }),
  sendMessage: (userId, body) => request(`/messages/${userId}`, { method: "POST", body: { body }, auth: true }),
  unreadMessagesCount: () => request("/messages/unread-count", { auth: true }),

  events: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events${qs ? `?${qs}` : ""}`, { auth: true });
  },
  event: (id) => request(`/events/${id}`, { auth: true }),
  createEvent: (data) => request("/events", { method: "POST", body: data, auth: true }),
  joinEvent: (id) => request(`/events/${id}/join`, { method: "POST", auth: true }),
  leaveEvent: (id) => request(`/events/${id}/leave`, { method: "DELETE", auth: true }),
  eventParticipants: (id) => request(`/events/${id}/participants`),

  listings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/marketplace${qs ? `?${qs}` : ""}`, { auth: true });
  },
  listing: (id) => request(`/marketplace/${id}`, { auth: true }),
  createListing: (data) => request("/marketplace", { method: "POST", body: data, auth: true }),
  markListingSold: (id) => request(`/marketplace/${id}/mark-sold`, { method: "PATCH", auth: true }),
  deleteListing: (id) => request(`/marketplace/${id}`, { method: "DELETE", auth: true }),
  saveListing: (id) => request(`/marketplace/${id}/save`, { method: "POST", auth: true }),
  unsaveListing: (id) => request(`/marketplace/${id}/save`, { method: "DELETE", auth: true }),
  savedListings: () => request("/marketplace/saved", { auth: true }),
  reportListing: (id, reason) => request(`/marketplace/${id}/report`, { method: "POST", body: { reason }, auth: true }),
  sightings: (postId) => request(`/posts/${postId}/sightings`),
  addSighting: (postId, data) => request(`/posts/${postId}/sightings`, { method: "POST", body: data, auth: true }),

  petHealth: (petId) => request(`/pets/${petId}/health`, { auth: true }),
  addHealthRecord: (petId, data) => request(`/pets/${petId}/health`, { method: "POST", body: data, auth: true }),
  deleteHealthRecord: (petId, recordId) => request(`/pets/${petId}/health/${recordId}`, { method: "DELETE", auth: true }),

  stories: () => request("/stories", { auth: true }),
  createStory: (photo_url) => request("/stories", { method: "POST", body: { photo_url }, auth: true }),
  deleteStory: (id) => request(`/stories/${id}`, { method: "DELETE", auth: true }),

  uploadImage,
};
