import copy

from fastapi.testclient import TestClient

from src.app import app, activities


client = TestClient(app)


# Guardamos una copia profunda del estado inicial y la restauramos después de cada test
ORIGINAL_ACTIVITIES = copy.deepcopy(activities)


def setup_function(function):
    # reset activities to original state before each test
    activities.clear()
    activities.update(copy.deepcopy(ORIGINAL_ACTIVITIES))


def teardown_function(function):
    activities.clear()
    activities.update(copy.deepcopy(ORIGINAL_ACTIVITIES))


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # Comprobamos que algunas actividades conocidas existen
    assert "Chess Club" in data
    assert "Programming Class" in data


def test_signup_and_unregister_flow():
    activity_name = "Chess Club"
    email = "test_student@example.com"

    # Asegurar que no está inscrito inicialmente
    res = client.get("/activities")
    assert res.status_code == 200
    assert email not in res.json()[activity_name]["participants"]

    # Signup
    res = client.post(f"/activities/{activity_name}/signup", params={"email": email})
    assert res.status_code == 200
    body = res.json()
    assert "Signed up" in body.get("message", "")

    # Verificar que aparece en la lista
    res = client.get("/activities")
    assert res.status_code == 200
    assert email in res.json()[activity_name]["participants"]

    # Intentar registrarse de nuevo -> error 400
    res = client.post(f"/activities/{activity_name}/signup", params={"email": email})
    assert res.status_code == 400

    # Unregister
    res = client.delete(f"/activities/{activity_name}/unregister", params={"email": email})
    assert res.status_code == 200
    assert "Unregistered" in res.json().get("message", "")

    # Verificar que ya no está
    res = client.get("/activities")
    assert res.status_code == 200
    assert email not in res.json()[activity_name]["participants"]
