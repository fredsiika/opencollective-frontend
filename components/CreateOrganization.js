import React from 'react';
import PropTypes from 'prop-types';

import { getErrorFromGraphqlException } from '../lib/errors';
import { compose } from '../lib/utils';
import { Router } from '../server/pages';

import { addEditCollectiveMembersMutation } from './onboarding-modal/OnboardingModal';
import Body from './Body';
import Container from './Container';
import { addCreateCollectiveMutation } from './create-collective';
import CreateOrganizationForm from './CreateOrganizationForm';
import Footer from './Footer';
import Header from './Header';
import SignInOrJoinFree from './SignInOrJoinFree';

class CreateOrganization extends React.Component {
  static propTypes = {
    host: PropTypes.object,
    createCollective: PropTypes.func,
    editCollectiveMembers: PropTypes.func,
    LoggedInUser: PropTypes.object,
    refetchLoggedInUser: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = { collective: { type: 'ORGANIZATION' }, result: {}, admins: [] };
    this.createCollective = this.createCollective.bind(this);
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

  async createCollective(collective) {
    if (!collective.authorization) {
      this.setState({
        result: { error: 'Please verify that you are an authorized representative of this organization' },
      });
      return;
    }

    this.setState({ status: 'loading' });
    collective.type = 'ORGANIZATION';

    delete collective.authorization;

    try {
      const response = await this.props.createCollective({
        variables: {
          collective,
        },
      });
      if (response) {
        await this.props.refetchLoggedInUser();
        const member = await this.props.LoggedInUser.memberOf.filter(
          member => member.collective.id === response.data.createCollective.legacyId,
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
            collectiveId: response.data.createCollective.legacyId,
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
        CollectiveId: collective.id,
        slug: collective.slug,
        status: 'collectiveCreated',
      });
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
                  onSubmit={this.createCollective}
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

const addGraphql = compose(addCreateCollectiveMutation, addEditCollectiveMembersMutation);
export default addGraphql(CreateOrganization);
