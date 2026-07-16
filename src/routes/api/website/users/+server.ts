import { json } from '@sveltejs/kit';
import { MongoClientInstance } from '$lib/database/mongo';
import type { RequestHandler } from '@sveltejs/kit';

const Applicant = MongoClientInstance.db('digitaldsa').collection('userApplications');

export const GET: RequestHandler = async ({ locals, url }) => {
    // Check authentication
    if (!locals.user) {
        return new Response(JSON.stringify({
            error: 'Unauthorized access'
        }), {
            status: 403,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    try {
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        
        const validPage = page > 0 ? page : 1;
        const validLimit = limit > 0 && limit <= 100 ? limit : 20;
        
        const skip = (validPage - 1) * validLimit;
        
        const totalCount = await Applicant.countDocuments();
        
        const users = await Applicant.find()
            .project({
                password: 0,
                securityQuestions: 0,
            })
            .skip(skip)
            .limit(validLimit)
            .toArray();
        
        return json({
            users,
            pagination: {
                page: validPage,
                limit: validLimit,
                totalCount,
                totalPages: Math.ceil(totalCount / validLimit)
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        
        return new Response(JSON.stringify({
            error: 'Failed to fetch users'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
};
