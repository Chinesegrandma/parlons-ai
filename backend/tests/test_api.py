import pytest
from fastapi.testclient import TestClient
from app import main

@pytest.fixture
def api(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DB_PATH', tmp_path / 'test.sqlite3')
    monkeypatch.setattr(main, 'client', None)
    monkeypatch.setattr(main, 'ELEVEN_KEY', '')
    main.init_db()
    with TestClient(main.app) as c:
        yield c

def test_health(api):
    r=api.get('/health')
    assert r.status_code == 200
    assert r.json()['mode'] == 'demo'

def test_chat_and_history(api):
    sid=api.post('/sessions',json={'topic':'cafe'}).json()['id']
    r=api.post('/chat',json={'session_id':sid,'message':'Bonjour'})
    assert r.status_code == 200
    assert r.json()['mode'] == 'demo'
    assert len(api.get(f'/sessions/{sid}/messages').json()['messages']) == 2

def test_unknown_session(api):
    assert api.post('/chat',json={'session_id':'missing','message':'bonjour'}).status_code == 404

def test_speech_requires_config(api):
    assert api.post('/speech/synthesize',json={'text':'bonjour'}).status_code == 503
    assert api.post('/speech/transcribe',files={'file':('x.webm',b'abc','audio/webm')}).status_code == 503
