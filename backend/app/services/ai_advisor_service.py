import os
from openai import AsyncOpenAI
from typing import List, Dict, Optional
from decimal import Decimal


class AIAdvisorService:
    """Service for AI-powered portfolio analysis and investment advice."""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=api_key) if api_key else None

    async def analyze_portfolio(
        self,
        portfolio_data: Dict,
        holdings: List[Dict],
        transactions: List[Dict],
    ) -> str:
        """
        Analyze a portfolio and provide AI-powered investment advice.

        Args:
            portfolio_data: Portfolio summary (total value, cost, gain/loss, etc.)
            holdings: List of current holdings with prices and performance
            transactions: Recent transaction history

        Returns:
            AI-generated analysis and recommendations
        """
        if not self.client:
            return "AI advisor is not configured. Please add your OpenAI API key to enable this feature."

        # Build context for the AI
        context = self._build_portfolio_context(portfolio_data, holdings, transactions)

        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an experienced investment advisor providing personalized portfolio analysis.

                        Your role is to:
                        - Analyze portfolio composition, diversification, and risk profile
                        - Provide insights on individual holdings and their performance
                        - Suggest investment strategies and potential areas for improvement
                        - Highlight any concerning trends or opportunities
                        - Give actionable, practical advice

                        Important disclaimers to include:
                        - This is educational information, not personalized financial advice
                        - Users should consult with a licensed financial advisor for their specific situation
                        - Past performance doesn't guarantee future results

                        Be conversational, insightful, and focus on helping the investor understand their portfolio better."""
                    },
                    {
                        "role": "user",
                        "content": f"Please analyze my investment portfolio and provide advice:\n\n{context}"
                    }
                ],
                temperature=0.7,
                max_tokens=2000,
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"Error generating AI advice: {str(e)}"

    def _build_portfolio_context(
        self,
        portfolio_data: Dict,
        holdings: List[Dict],
        transactions: List[Dict],
    ) -> str:
        """Build a comprehensive context string for the AI."""

        context_parts = []

        # Portfolio summary
        context_parts.append("## Portfolio Summary")
        context_parts.append(f"- Total Value: ${float(portfolio_data.get('total_value', 0)):,.2f}")
        context_parts.append(f"- Total Cost: ${float(portfolio_data.get('total_cost', 0)):,.2f}")
        context_parts.append(f"- Total Gain/Loss: ${float(portfolio_data.get('total_gain_loss', 0)):,.2f}")
        context_parts.append(f"- Return: {float(portfolio_data.get('total_gain_loss_percent', 0)):.2f}%")
        context_parts.append("")

        # Holdings breakdown
        context_parts.append("## Current Holdings")
        if holdings:
            for holding in holdings:
                symbol = holding.get('symbol', 'Unknown')
                quantity = float(holding.get('quantity', 0))
                avg_cost = float(holding.get('average_cost', 0))
                current_price = float(holding.get('current_price', 0)) if holding.get('current_price') else None
                current_value = float(holding.get('current_value', 0)) if holding.get('current_value') else None
                gain_loss = float(holding.get('unrealized_gain_loss', 0)) if holding.get('unrealized_gain_loss') else None
                gain_loss_pct = float(holding.get('unrealized_gain_loss_percent', 0)) if holding.get('unrealized_gain_loss_percent') else None

                context_parts.append(f"\n### {symbol}")
                context_parts.append(f"- Quantity: {quantity:.2f} shares")
                context_parts.append(f"- Average Cost: ${avg_cost:.2f}")
                if current_price:
                    context_parts.append(f"- Current Price: ${current_price:.2f}")
                if current_value:
                    context_parts.append(f"- Current Value: ${current_value:.2f}")
                if gain_loss is not None:
                    context_parts.append(f"- Unrealized Gain/Loss: ${gain_loss:.2f} ({gain_loss_pct:.2f}%)")
        else:
            context_parts.append("No holdings currently.")

        context_parts.append("")

        # Recent activity
        context_parts.append("## Recent Transaction Activity")
        if transactions:
            # Show last 10 transactions
            recent_txns = transactions[:10]
            for txn in recent_txns:
                txn_type = txn.get('transaction_type', 'Unknown')
                symbol = txn.get('symbol', 'Unknown')
                quantity = float(txn.get('quantity', 0))
                price = float(txn.get('price', 0))
                date = txn.get('transaction_date', 'Unknown')

                context_parts.append(f"- {date}: {txn_type} {quantity:.2f} shares of {symbol} @ ${price:.2f}")
        else:
            context_parts.append("No recent transactions.")

        return "\n".join(context_parts)


# Singleton instance
ai_advisor_service = AIAdvisorService()
