import tree_sitter
from typing import List, Optional, Dict, Any
from app.models.schemas import ChunkMetadata
from app.parsing.text_chunker import chunk_text_file, generate_chunk_id
from app.ingestion.file_filter import determine_source_type

# Load Tree-sitter Language modules dynamically
PARSERS: Dict[str, Any] = {}

def _init_tree_sitter_parsers():
    global PARSERS
    lang_modules = [
        ("python", "tree_sitter_python"),
        ("javascript", "tree_sitter_javascript"),
        ("typescript", "tree_sitter_typescript"),
        ("go", "tree_sitter_go"),
        ("rust", "tree_sitter_rust"),
        ("java", "tree_sitter_java"),
        ("cpp", "tree_sitter_cpp"),
    ]

    for lang_name, mod_name in lang_modules:
        try:
            mod = __import__(mod_name)
            lang_capsule = mod.language()
            ts_lang = tree_sitter.Language(lang_capsule)
            parser = tree_sitter.Parser(ts_lang)
            PARSERS[lang_name] = (ts_lang, parser)
        except Exception:
            pass

_init_tree_sitter_parsers()

# Target node types to capture per language
TARGET_NODE_TYPES = {
    "function_definition", "async_function_definition", "class_definition",
    "function_declaration", "method_definition", "class_declaration",
    "interface_declaration", "type_alias_declaration", "enum_declaration",
    "struct_item", "fn_item", "impl_item", "trait_item", "method_declaration",
    "function_item"
}


def parse_code_file(
    repository_id: str,
    file_path: str,
    content: str,
    language: str,
    commit_sha: str = ""
) -> List[ChunkMetadata]:
    """
    Parses a source code file using Tree-sitter AST where available, falling back to line chunker.
    """
    if not content or not content.strip():
        return []

    lines = content.splitlines()
    total_lines = len(lines)

    # Use fallback text chunker for non-AST languages or small files
    if language not in PARSERS or total_lines < 10:
        return chunk_text_file(repository_id, file_path, content, language, commit_sha)

    _, parser = PARSERS[language]
    source_bytes = bytes(content, "utf-8")
    
    try:
        tree = parser.parse(source_bytes)
        root_node = tree.root_node
    except Exception:
        return chunk_text_file(repository_id, file_path, content, language, commit_sha)

    source_type = determine_source_type(file_path, language)
    chunks: List[ChunkMetadata] = []
    visited_lines = set()

    def extract_symbol_name(node) -> Optional[str]:
        name_node = node.child_by_field_name("name")
        if name_node:
            return source_bytes[name_node.start_byte:name_node.end_byte].decode("utf-8", errors="ignore")
        return None

    def traverse(node):
        node_type = node.type
        start_line = node.start_point.row + 1
        end_line = node.end_point.row + 1

        # Check children first to capture nested methods/functions
        for child in node.children:
            traverse(child)

        if node_type in TARGET_NODE_TYPES and (end_line - start_line >= 1):
            chunk_content = source_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="ignore")
            
            if chunk_content.strip():
                symbol_name = extract_symbol_name(node)
                chunk_id = generate_chunk_id(repository_id, file_path, start_line, end_line, chunk_content)
                
                # Check for duplicate chunk_id
                if not any(c.chunk_id == chunk_id for c in chunks):
                    chunks.append(
                        ChunkMetadata(
                            chunk_id=chunk_id,
                            repository_id=repository_id,
                            file_path=file_path,
                            language=language,
                            start_line=start_line,
                            end_line=end_line,
                            symbol_name=symbol_name,
                            symbol_type=node_type,
                            source_type=source_type,
                            commit_sha=commit_sha,
                            content=chunk_content
                        )
                    )

                    for l in range(start_line, end_line + 1):
                        visited_lines.add(l)

    traverse(root_node)

    if chunks:
        # Sort chunks chronologically by start line
        chunks.sort(key=lambda c: c.start_line)
        return chunks

    # Fallback if tree-sitter couldn't find targeted symbols
    return chunk_text_file(repository_id, file_path, content, language, commit_sha)
