import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { writeFileSync } from 'fs';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class TaxSlabService {
    constructor(private readonly httpService: HttpService) { }

    // Function to generate the prompt template
    private generateTaxSlabPrompt(text: string): string {
        return `You are an AI assistant specialized in Indian tax regulations. Only respond to every queries related to Tax. If the query is not related to indian tax regulatory, respond with "This query is not related to tax slabs."
        Query: ${text}
        Note: also dont use any special characters in response text e.g *,/,',$ etc, use \n for the new line
Response:`

    }

    // Function to get tax slab suggestion
    async getTaxSlabSuggestion(text: string) {
        const prompt = this.generateTaxSlabPrompt(text);
        const apiKey = 'AIzaSyDY-aWL5t7e8LT6rJOqiHvmtfFfXOszrGA';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const body = {
            contents: [
                {
                    parts: [{ text: prompt }],
                },
            ],
        };

        try {
            const response = await lastValueFrom(
                this.httpService.post(url, body, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }),
            );

            if (response.status !== 200) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = response.data;
            const responseTxt = data?.candidates[0]?.content?.parts[0]?.text;

            if (responseTxt) {
                // Write the HTML content to a file
                // writeFileSync('tax_slab_suggestion.html', responseTxt, 'utf8');
                // console.log('HTML content written to tax_slab_suggestion.html');
                return {
                    data: responseTxt
                };
            } else {
                console.error('No HTML content found in the response.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}