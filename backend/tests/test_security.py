import pytest
from app.core.security import parse_github_url, sanitize_chat_query


def test_parse_github_url_valid():
    owner, repo, repository_id = parse_github_url("https://github.com/fastapi/fastapi")
    assert owner == "fastapi"
    assert repo == "fastapi"
    assert repository_id == "fastapi_fastapi"


def test_parse_github_url_with_git_suffix():
    owner, repo, repository_id = parse_github_url("https://github.com/openai/openai-python.git")
    assert owner == "openai"
    assert repo == "openai-python"
    assert repository_id == "openai_openai_python"


def test_parse_github_url_invalid():
    with pytest.raises(ValueError):
        parse_github_url("https://google.com/not/github")

    with pytest.raises(ValueError):
        parse_github_url("https://github.com/../invalid")


def test_sanitize_chat_query():
    raw = "  How does auth work?   "
    clean = sanitize_chat_query(raw, max_chars=100)
    assert clean == "How does auth work?"

    long_input = "a" * 3000
    truncated = sanitize_chat_query(long_input, max_chars=50)
    assert len(truncated) == 50
