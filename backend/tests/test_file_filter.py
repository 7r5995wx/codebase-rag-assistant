from app.ingestion.file_filter import is_ignored_directory, get_file_language, determine_source_type


def test_is_ignored_directory():
    assert is_ignored_directory("node_modules") is True
    assert is_ignored_directory(".git") is True
    assert is_ignored_directory("__pycache__") is True
    assert is_ignored_directory("src") is False
    assert is_ignored_directory("components") is False


def test_get_file_language():
    assert get_file_language("src/index.ts") == "typescript"
    assert get_file_language("app/main.py") == "python"
    assert get_file_language("README.md") == "markdown"
    assert get_file_language("package-lock.json") is None
    assert get_file_language("image.png") is None


def test_determine_source_type():
    assert determine_source_type("src/auth.ts", "typescript") == "code"
    assert determine_source_type("README.md", "markdown") == "documentation"
    assert determine_source_type("docs/architecture.md", "markdown") == "documentation"
    assert determine_source_type("tsconfig.json", "json") == "configuration"
