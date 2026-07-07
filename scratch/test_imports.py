libs = ["torch", "transformers", "sentence_transformers", "clip", "onnxruntime"]
for lib in libs:
    try:
        __import__(lib)
        print(f"{lib}: AVAILABLE")
    except ImportError:
        print(f"{lib}: NOT AVAILABLE")
    except Exception as e:
        print(f"{lib}: FAILED ({e})")
