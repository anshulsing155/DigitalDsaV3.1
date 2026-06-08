import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/guards.js';
import {
	rmApplications,
	RMSubmissions,
	PolicyEvidenceDocuments,
	ReviewComments
} from '$lib/database/mongo.js';
import { ObjectId } from 'mongodb';

export const load: PageServerLoad = async ({ locals, params }) => {
	requireRole(locals, 'rm');

	const user = locals.user!;
	let rmDoc;
	try {
		rmDoc = await rmApplications.findOne({ _id: new ObjectId(user.id) });
	} catch {
		rmDoc = await rmApplications.findOne({
			mobileNumber: { $in: [Number(user.mobileNumber), user.mobileNumber] } as any
		});
	}

	if (!rmDoc?._id) {
		throw error(404, 'RM profile not found');
	}

	const submission = await RMSubmissions.findOne({
		submission_id: params.submission_id,
		rm_id: rmDoc._id.toString()
	});

	if (!submission) {
		throw error(404, 'Submission not found');
	}

	// Load documents and comments
	const [documents, comments] = await Promise.all([
		submission.document_ids.length > 0
			? PolicyEvidenceDocuments.find({ document_id: { $in: submission.document_ids } }).toArray()
			: Promise.resolve([]),
		ReviewComments.find({
			target_type: 'rm_submission',
			target_id: submission._id
		})
			.sort({ created_at: -1 })
			.toArray()
	]);

	return {
		submission: {
			...submission,
			_id: submission._id.toString(),
			resulting_version_id: submission.resulting_version_id?.toString() || null,
			created_at: submission.created_at ? new Date(submission.created_at).toISOString() : null,
			updated_at: submission.updated_at ? new Date(submission.updated_at).toISOString() : null
		},
		documents: documents.map((d) => ({
			...d,
			_id: d._id.toString(),
			created_at: d.created_at ? new Date(d.created_at).toISOString() : null
		})),
		comments: comments.map((c) => ({
			...c,
			_id: c._id.toString(),
			target_id: c.target_id.toString(),
			resolved_at: c.resolved_at ? new Date(c.resolved_at).toISOString() : null,
			created_at: c.created_at ? new Date(c.created_at).toISOString() : null
		}))
	};
};
