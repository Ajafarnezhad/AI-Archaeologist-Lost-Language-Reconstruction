# AI Archaeologist: Ancient Language Reconstruction

Project Overview:  
Ancient inscriptions are often incomplete because they have been damaged by time, weather, or human activity. Missing words and broken tablets make it difficult for archaeologists to understand the meaning of the original texts.
Reconstructing these fragments is often a time-consuming and inefficient process that requires high expertise.  
AI Archaeologist was developed to assist in this process.
We built this intelligent system to help in reconstructing missing language fragments, while explaining the reasoning behind each prediction.
One of our main goals was to make the system explainable. Rather than only generating a reconstructed text, the model also provides confidence scores, supporting evidence, and graph-based representations to help users understand the process of reaching the final prediction.

Our Solution:  
We designed a reconstruction pipeline where each element contributes to improving the final prediction.
The process begins by preprocessing fragmented text before passing it through an ensemble of deep learning models.
The generated predictions are then refined using lexical matching and translation memory, allowing the system to compare fragments with examples seen before.
Next, semantic analysis identifies important relationships within the reconstructed sentence. These relationships are transformed into an archaeological knowledge graph that connects historical periods, semantic concepts, linguistic relationships, words, and characters.
Finally, the system evaluates its own confidence and generates an explanation describing why a particular reconstruction was selected.  
This multi-layered approach makes the system more reliable while also making its decisions easier to understand.

Why We Built It This Way:  
One of the greatest challenges in ancient language reconstruction is uncertainty. Several different reconstructions may seem reasonable, yet only one reflects the original meaning.  
Instead of hiding this uncertainty, we designed our system to acknowledge it. Every reconstruction is accompanied by a confidence score and supporting evidence so users can better understand the reliability of the prediction.  
We also wished to move beyond treating language as individual words.
By organizing reconstructed information into knowledge graphs, the system captures the relationships between historical entities and concepts, making the output more informative.

Features:  
Our system includes:  
Ensemble deep learning reconstruction using multiple ByT5 models  
Post-processing using lexical matching and translation memory to improve quality  
Translation memory retrieval using similar historical examples  
Semantic analysis for better understanding  
Confidence estimation for every prediction  
Explainability reports describing the reasoning behind predictions  
Interactive multi-layer archaeological knowledge graphs  
Graph-based visualization of semantic and historical relationships

System Workflow:  
Fragmented Ancient Text  
        │  
        ▼  
Preprocessing  
        │  
        ▼  
Deep Learning Ensemble  
        │  
        ▼  
Lexicon Matching & Translation Memory  
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
Translation memory retrieval  
Knowledge graph relationships

Dependencies:  
- Python 3.11 or later
- Install dependencies:
- ```pip install -r Requirements.txt```

How to run:  

Future Improvements:  
Although the current system provides reliable reconstructions, there are many exciting directions we would like to explore in the future.  
These include supporting OCR for damaged inscriptions, incorporating Graph Neural Networks for richer historical reasoning, and using multilingual datasets.

Team:  
Team members:  
Amirhossein Jafarnezhad: Team leader  
Sepehr Kakoli: Code localization, confidence interval integration and performance analysis.  
Seyedeh Sara Davari: Interactive graph development, code refactoring and README preparation.  
Danial Rafiee: UI/UX Design.  
Ali Akbar Khara: Baseline Implementation.

Contact:  
Amirhossein Jafarnezhad: aiamirjd@gmail.com  
Sepehr Kakoli: sepehrk890@gmail.com  
Seyedeh Sara Davari: saradavari2009@gmail.com  
Danial Rafiee: rafieedanial414@gmail.com  
Ali Akbar Khara: mzkh209090@gmail.com

Acknowledgements:  
This project was developed for the Innoverse Expo AI Programming Challenge. It gave us an opportunity to explore how modern AI techniques can be applied to ancient language reconstruction and how explainable AI can make the results and predictions more transparent.
