import json

import pytest

from app import main, providers


@pytest.mark.parametrize("topic", list(main.TOPICS))
def test_all_scenarios_persist_opening_and_supply_topic_context(api, transport, topic):
    requests = []

    def handler(request):
        requests.append(json.loads(request.content))
        return providers.mock_response(request)

    transport(handler)
    created = api.post("/sessions", json={"topic": topic})
    assert created.status_code == 200
    session = created.json()
    assert session["topic"] == topic
    assert session["messages"][0]["content"] == main.OPENERS[topic]
    assert api.get(f"/sessions/{session['id']}").json()["messages"] == session["messages"]
    response = api.post("/chat", json={"session_id": session["id"], "message": "Bonjour"})
    assert response.status_code == 200
    assert main.TOPICS[topic] in requests[0]["messages"][0]["content"]
    assert requests[0]["messages"][1]["content"] == main.OPENERS[topic]
