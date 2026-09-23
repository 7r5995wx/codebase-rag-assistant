from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "project" in data


def test_analyze_invalid_repo():
    response = client.post("/api/repositories/analyze", json={"url": "not-a-url"})
    assert response.status_code == 400


def test_indexing_status_not_found():
    response = client.get("/api/repositories/non_existent_repo/status")
    assert response.status_code in [404, 422]
