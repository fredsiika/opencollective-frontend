import React from 'react';
import PropTypes from 'prop-types';
import { graphql } from '@apollo/client/react/hoc';

import { getErrorFromGraphqlException } from '../lib/errors';
import { API_V2_CONTEXT, gqlV2 } from '../lib/graphql/helpers';
import { compose } from '../lib/utils';
import { Router } from '../server/pages';

import { addEditCollectiveMembersMutation } from './onboarding-modal/OnboardingModal';
import Body from './Body';
import Container from './Container';
import CreateOrganizationForm from './CreateOrganizationForm';
import Footer from './Footer';
import Header from './Header';
import SignInOrJoinFree from './SignInOrJoinFree';

class CreateOrganization extends React.Component {
  static propTypes = {
    createOrganization: PropTypes.func,
    editCollectiveMembers: PropTypes.func,
    LoggedInUser: PropTypes.object,
    refetchLoggedInUser: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { collective: { type: 'ORGANIZATION' }, result: {}, admins: [] };
    this.createOrganization = this.createOrganization.bind(this);
    this.error = this.error.bind(this);
    this.resetError = this.resetError.bind(this);
  }

  error(msg) {
    this.setState({ result: { error: msg } });
  }

  resetError() {
    this.error();
  }

  updateAdmins = admins => {
    this.setState({ admins });
  };

  async createOrganization(organization) {
    if (!organization.authorization) {
      this.setState({
        result: { error: 'Please verify that you are an authorized representative of this organization' },
      });
      return;
    }

    this.setState({ status: 'loading' });

    delete organization.authorization;

    try {
      const response = await this.props.createOrganization({
        variables: {
          organization,
        },
      });

      if (response) {
        await this.props.refetchLoggedInUser();
        const member = await this.props.LoggedInUser.memberOf.filter(
          member => member.collective.id === response.data.createOrganization.legacyId,
        );
        const adminList = this.state.admins.filter(admin => {
          if (admin.member.id !== this.props.LoggedInUser.collective.id) {
            return admin;
          }
        });

        this.setState({
          admins: [...adminList, { role: 'ADMIN', member: this.props.LoggedInUser.collective, id: member[0].id }],
        });

        await this.props.editCollectiveMembers({
          variables: {
            collectiveId: response.data.createOrganization.legacyId,
            members: this.state.admins.map(member => ({
              id: member.id,
              role: member.role,
              member: {
                id: member.member.id,
                name: member.member.name,
              },
            })),
          },
        });
      }
      await this.props.refetchLoggedInUser();

      Router.pushRoute('collective', {
        slug: response.data.createOrganization.slug,
        status: 'collectiveCreated',
      }).then(() => window.scrollTo(0, 0));
    } catch (err) {
      const errorMsg = getErrorFromGraphqlException(err).message;
      this.setState({ result: { error: errorMsg } });
      throw new Error(errorMsg);
    }
  }

  render() {
    const { LoggedInUser } = this.props;
    const { result, collective, status } = this.state;
    const title = 'Create organization';

    return (
      <div className="CreateOrganization">
        <Header
          title={title}
          className={status}
          LoggedInUser={LoggedInUser}
          menuItems={{ pricing: true, howItWorks: true }}
        />

        <Body>
          <div className="content">
            {!LoggedInUser && (
              <Container textAlign="center">
                <SignInOrJoinFree />
              </Container>
            )}
            {LoggedInUser && (
              <div>
                <CreateOrganizationForm
                  collective={collective}
                  onSubmit={this.createOrganization}
                  onChange={this.resetError}
                  error={result.error}
                  updateAdmins={this.updateAdmins}
                  loading={status == 'loading'}
                />
                <Container
                  textAlign="center"
                  alignItems="center"
                  justifyContent="center"
                  marginBottom="5rem"
                  width={[100, 200, 600]}
                >
                  <Container color="green.500">{this.state.result.success}</Container>
                </Container>
              </div>
            )}
          </div>
        </Body>
        <Footer />
      </div>
    );
  }
}

const createOrganizationMutation = gqlV2/* GraphQL */ `
  mutation CreateOrganization($organization: OrganizationCreateInput!) {
    createOrganization(organization: $organization) {
      id
      name
      slug
      description
      website
      legacyId
    }
  }
`;

const addCreateOrganizationMutation = graphql(createOrganizationMutation, {
  name: 'createOrganization',
  options: { context: API_V2_CONTEXT },
});

const addGraphql = compose(addCreateOrganizationMutation, addEditCollectiveMembersMutation);

export default addGraphql(CreateOrganization);
