// ============================================
// KNOWLEDGE BASE ROUTES
// SECURITY: All routes require authentication
// ============================================
const express = require('express');
const router = express.Router();
const { supabase } = require('../config');
const { generateKnowledgeBaseEmbeddings, generateDocumentEmbedding } = require('../services');
const { verifySupabaseAuth } = require('../lib/auth');

/**
 * Generate embeddings for documents in a knowledge base
 * POST /api/knowledge-base/:knowledgeBaseId/generate-embeddings
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/:knowledgeBaseId/generate-embeddings', verifySupabaseAuth, async (req, res) => {
    try {
        const { knowledgeBaseId } = req.params;
        // SECURITY: Use authenticated user ID, not from request body
        const userId = req.userId;

        if (!knowledgeBaseId) {
            return res.status(400).json({ error: 'knowledgeBaseId is required' });
        }

        // Verify ownership
        const { data: kb } = await supabase
            .from('knowledge_bases')
            .select('id, name')
            .eq('id', knowledgeBaseId)
            .eq('user_id', userId)
            .single();

        if (!kb) {
            return res.status(404).json({ error: 'Knowledge base not found' });
        }

        console.log('Generating embeddings for knowledge base:', kb.name);
        
        const result = await generateKnowledgeBaseEmbeddings(knowledgeBaseId);

        res.json({
            success: true,
            knowledgeBase: kb.name,
            embeddings: result
        });

    } catch (error) {
        console.error('Error generating embeddings:', error);
        res.status(500).json({ error: error.message || 'Failed to generate embeddings' });
    }
});

/**
 * Generate embedding for a single document
 * POST /api/knowledge-base/document/:documentId/generate-embedding
 * PROTECTED: Requires valid Supabase JWT token
 */
router.post('/document/:documentId/generate-embedding', verifySupabaseAuth, async (req, res) => {
    try {
        const { documentId } = req.params;
        // SECURITY: Use authenticated user ID, not from request body
        const userId = req.userId;

        if (!documentId) {
            return res.status(400).json({ error: 'documentId is required' });
        }

        // Fetch document with ownership check
        const { data: doc } = await supabase
            .from('knowledge_base_documents')
            .select('id, content, text_content, name')
            .eq('id', documentId)
            .eq('user_id', userId)
            .single();

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const content = doc.content || doc.text_content;
        if (!content || content.length < 10) {
            return res.status(400).json({ error: 'Document has no content to embed' });
        }

        console.log('Generating embedding for document:', doc.name);
        
        const result = await generateDocumentEmbedding(doc.id, content);

        res.json({
            success: result,
            document: doc.name,
            message: result ? 'Embedding generated successfully' : 'Failed to generate embedding'
        });

    } catch (error) {
        console.error('Error generating document embedding:', error);
        res.status(500).json({ error: error.message || 'Failed to generate embedding' });
    }
});

module.exports = router;
