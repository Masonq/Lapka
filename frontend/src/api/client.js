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

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
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
    let detail = "Что-то пошло не так";
    try {
      const data = await res.json();
      detail = data.detail || detail;
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
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    let detail = "Не удалось загрузить фото";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // no-op
    }
    throw new Error(detail);
  }

  return res.json();
}

export const api = {
  register: (data) => request("/auth/register", { method: "POST", body: data }),
  login: (data) => request("/auth/login", { method: "POST", body: data }),
  telegramAuth: (data) => request("/auth/telegram", { method: "POST", body: data }),
  me: () => request("/auth/me", { auth: true }),

  user: (id) => request(`/users/${id}`),

  posts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/posts${qs ? `?${qs}` : ""}`);
  },
  createPost: (data) => request("/posts", { method: "POST", body: data, auth: true }),
  post: (id) => request(`/posts/${id}`),
  resolvePost: (id) => request(`/posts/${id}/resolve`, { method: "PATCH", auth: true }),
  deletePost: (id) => request(`/posts/${id}`, { method: "DELETE", auth: true }),
  savePost: (id) => request(`/posts/${id}/save`, { method: "POST", auth: true }),
  unsavePost: (id) => request(`/posts/${id}/save`, { method: "DELETE", auth: true }),
  savedPosts: () => request("/posts/saved", { auth: true }),
  reportPost: (id, reason) => request(`/posts/${id}/report`, { method: "POST", body: { reason }, auth: true }),
  comments: (id) => request(`/posts/${id}/comments`),
  addComment: (id, body) => request(`/posts/${id}/comments`, { method: "POST", body, auth: true }),

  myPets: () => request("/pets/mine", { auth: true }),
  petsOfUser: (userId) => request(`/pets/user/${userId}`),
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
  followers: (userId) => request(`/follows/${userId}/followers`),

  uploadImage,
};
