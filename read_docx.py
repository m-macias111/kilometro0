import zipfile
import xml.etree.ElementTree as ET

def extract_docx(doc_path):
    try:
        with zipfile.ZipFile(doc_path) as z:
            xml_content = z.read('word/document.xml')
            tree = ET.XML(xml_content)
            
            # The namespace for w:t elements
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            paragraphs = []
            # Find all <w:p> (paragraphs) to group text correctly
            for p in tree.iterfind('.//w:p', namespaces=ns):
                texts = [node.text for node in p.iterfind('.//w:t', namespaces=ns) if node.text]
                if texts:
                    paragraphs.append(''.join(texts))
            
            with open('kilometro_0.txt', 'w', encoding='utf-8') as f:
                f.write('\n\n'.join(paragraphs))
                
        print("Extraction complete.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    extract_docx('Kilometro 0.docx')
