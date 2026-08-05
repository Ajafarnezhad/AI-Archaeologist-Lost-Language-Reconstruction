# AI Archaeologist: Graph-Enhanced Ancient Language Reconstruction

Project Overview:  
Ancient texts are often incomplete because they have been damaged by time, weather, or human activity. Missing words and broken inscriptions make it difficult for archaeologists to understand the concept of the original texts.
Reconstructing these fragments is often a time-consuming and inefficient process that requires high expertise and considerable time.  
AI Archaeologist was developed to assist in this process.
We developed this intelligent system to help in reconstructing missing language fragments, while explaining the reasoning behind each prediction.
One of our main goals was to make the system explainable. Rather than only generating a reconstructed text, the model also provides confidence scores, supporting evidence, and graph-based representations to help users understand the process of reaching the final prediction.

Our Solution:  
We designed a reconstruction pipeline where each element contributes to improving the final prediction.
The process begins by preprocessing fragmented text before passing it through an ensemble of deep learning models.
The generated predictions are then refined using lexical matching and translation memory, allowing the system to compare fragments with examples seen before.
Next, semantic analysis identifies important relationships within the reconstructed sentence. These relationships are transformed into an archaeological knowledge graph that connects historical periods, semantic concepts, linguistic relationships, words, and characters.
Finally, the system evaluates its own confidence and generates an explanation describing why a particular reconstruction was selected.
This multi-layered approach makes the system more reliable while also making its decisions easier to understand.

Features:  
Our system includes:  
Ensemble deep learning reconstruction using multiple ByT5 models 
Intelligent post-processing to improve quality  
Translation memory retrieval using similar historical examples  
Semantic analysis for better understanding  
Confidence estimation for every prediction  
Explainability reports describing the reasoning behind predictions  
Interactive multi-layer archaeological knowledge graphs  
Graph-based visualization of semantic and historical relationships

Why We Built It This Way:  
One of the greatest challenges in ancient language reconstruction is uncertainty. Several different reconstructions may seem reasonable, yet only one reflects the original meaning.  
Instead of hiding this uncertainty, we designed our system to acknowledge it. Every reconstruction is accompanied by a confidence score and supporting evidence so users can better understand the reliability of the prediction.  
We also wished to move beyond treating language as individual words.
By organizing reconstructed information into knowledge graphs, the system captures the relationships between historical entities and concepts, making the output more informative.

System Workflow:  
Fragmented Ancient Text  
        │  
        ▼  
Preprocessing  
        │  
        ▼  
Deep Learning Reconstruction  
        │  
        ▼  
Lexicon & Translation Memory  
        │  
        ▼  
Semantic Analysis  
        │  
        ▼  
Knowledge Graph Construction  
        │  
        ▼  
Confidence Estimation  
        │  
        ▼  
Explainability Report  
        │  
        ▼  
Final Reconstruction

Example:  
Input:  
The k__g built the temple.  
Reconstruction:  
The king built the temple.  
Confidence:  
94%  
Supporting Evidence:  
Grammar consistency  
Semantic context  
Translation memory  
Knowledge graph relationships

Dependencies:  
os  
re  
gc  
csv  
json  
torch  
difflib  
warnings  
unicodedata  
numpy  
pandas  
pathlib  
tqdm  
plotly  
collections  
transformers  
torch

How to run:  

Future Improvements:  
Although the current system provides reliable reconstructions, there are many exciting directions for future development.  
These include supporting OCR for damaged inscriptions, incorporating Graph Neural Networks for richer historical reasoning, and expanding multilingual datasets.

Why This Project Matters:  
Ancient languages are an essential part of human history, but many historical records remain incomplete or difficult to interpret. We believe artificial intelligence can become a valuable tool for archaeologists and historians by assisting with reconstruction and interpretation.  
Our goal was not to replace archaeologists, but to develop a system that helps them work more efficiently by providing informed suggestions, visualizing historical relationships and explaining the reconstruction process.

Team:  
Team members:  
Sepehr Kakoli: 
Seyedeh Sara Davari: Interactive graph development, code refactoring and README preperation.
Danial Rafiee: 
Ali Akbar Khara: 

Contact:  

Acknowledgements:  
This projects was developed for the Innoverse Expo AI Programming Challenge. It reflects our interest in combining artificial intelligence, historical linguistics and digital archaeology to develop practical tools that can aid the relentless efforts made by experts for understanding and preserving ancient languages.
