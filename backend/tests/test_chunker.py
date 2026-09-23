from app.parsing.text_chunker import chunk_text_file
from app.parsing.tree_sitter_parser import parse_code_file


def test_text_chunker():
    sample_md = "# Title\n\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5"
    chunks = chunk_text_file(
        repository_id="test_repo",
        file_path="README.md",
        content=sample_md,
        language="markdown",
        target_lines=3,
        overlap_lines=1
    )
    assert len(chunks) > 0
    assert chunks[0].repository_id == "test_repo"
    assert chunks[0].file_path == "README.md"
    assert chunks[0].source_type == "documentation"


def test_python_tree_sitter_chunker():
    py_code = """
def calculate_total(items):
    total = 0
    for item in items:
        total += item.price
    return total

class ItemProcessor:
    def __init__(self, name):
        self.name = name

    def process(self):
        return True
"""
    chunks = parse_code_file(
        repository_id="test_repo",
        file_path="src/processor.py",
        content=py_code,
        language="python"
    )
    assert len(chunks) >= 2
    symbols = [c.symbol_name for c in chunks if c.symbol_name]
    assert "calculate_total" in symbols or "ItemProcessor" in symbols
