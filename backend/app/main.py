from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.db import Base, engine
from app.routers import auth, follows, pets, posts, services

Base.metadata.create_all(bind=engine)

app = FastAPI(title="LapaBG API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(pets.router)
app.include_router(services.router)
app.include_router(follows.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "LapaBG"}
